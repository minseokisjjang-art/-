import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EARN } from '../data/items';
import type {
  CatColor, ClassroomSnapshot, InventoryEntry, JoinResult,
  OpenBoxResult, PatEntry, PresenceState, Profile, Wallet,
} from '../types';
import { dayLabelOf, timeBucketOf } from '../types';
import type { Backend } from './types';
import { Emitter } from './types';

/*
 * SupabaseBackend — 실서버 모드.
 * .env에 EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY가 있으면 선택된다.
 * 모든 상태 변경은 supabase/migrations/0001_init.sql의 SECURITY DEFINER RPC를 통해서만.
 */

export class SupabaseBackend implements Backend {
  readonly kind = 'supabase' as const;
  private sb: SupabaseClient;
  private emitter = new Emitter();
  private myId: string | null = null;
  private channelReady = false;

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }

  on(event: string, cb: () => void) { return this.emitter.on(event, cb); }

  async init(): Promise<Profile | null> {
    let { data: { session } } = await this.sb.auth.getSession();
    if (!session) {
      const { data, error } = await this.sb.auth.signInAnonymously();
      if (error) throw error;
      session = data.session;
    }
    this.myId = session?.user.id ?? null;
    if (!this.myId) return null;

    const { data: row } = await this.sb
      .from('profiles').select('*').eq('id', this.myId).maybeSingle();
    if (!row) return null;
    this.subscribe();
    return this.mapProfile(row);
  }

  private mapProfile(row: any): Profile {
    return {
      id: row.id,
      nickname: row.nickname,
      catColor: row.cat_color as CatColor,
      shareStatus: row.share_status,
      shareCounter: row.share_counter,
      totalCount: Number(row.total_count ?? 0),
    };
  }

  private subscribe() {
    if (this.channelReady || !this.myId) return;
    this.channelReady = true;
    // RLS가 적용된 postgres_changes — 이벤트가 오면 스냅샷을 다시 그린다 (단순·견고)
    this.sb.channel('room-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' },
        () => this.emitter.emit('members'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' },
        () => { this.emitter.emit('inventory'); this.emitter.emit('members'); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_members' },
        () => this.emitter.emit('members'))
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'pats',
        filter: `to_profile=eq.${this.myId}`,
      }, () => { this.emitter.emit('pats'); this.emitter.emit('patReceived'); })
      .subscribe();
  }

  /* ── 프로필 ── */

  async createProfile(nickname: string, catColor: CatColor): Promise<Profile> {
    const { error } = await this.sb.rpc('upsert_profile', {
      p_nickname: nickname, p_cat_color: catColor,
    });
    if (error) throw error;
    this.subscribe();
    const { data } = await this.sb.from('profiles').select('*').eq('id', this.myId!).single();
    return this.mapProfile(data);
  }

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    const { data: cur } = await this.sb.from('profiles').select('*').eq('id', this.myId!).single();
    const next = { ...this.mapProfile(cur), ...patch };
    const { error: e1 } = await this.sb.rpc('upsert_profile', {
      p_nickname: next.nickname, p_cat_color: next.catColor,
    });
    if (e1) throw e1;
    const { error: e2 } = await this.sb.rpc('set_sharing', {
      p_share_status: next.shareStatus, p_share_counter: next.shareCounter,
    });
    if (e2) throw e2;
    this.emitter.emit('members');
    return next;
  }

  /* ── 교실 ── */

  async createClassroom(): Promise<string> {
    const { data, error } = await this.sb.rpc('create_classroom');
    if (error) throw error;
    this.emitter.emit('members');
    return data as string;
  }

  async joinClassroom(code: string): Promise<JoinResult> {
    const { data, error } = await this.sb.rpc('join_classroom', { p_code: code });
    if (error) return 'not_found';
    this.emitter.emit('members');
    return data as JoinResult;
  }

  async leaveClassroom(): Promise<void> {
    await this.sb.rpc('leave_classroom');
    this.emitter.emit('members');
  }

  async getSnapshot(): Promise<ClassroomSnapshot> {
    const { data, error } = await this.sb.rpc('classroom_snapshot');
    if (error || !data) return { code: null, members: [] };
    const snap = data as any;
    return {
      code: snap.code ?? null,
      members: (snap.members ?? []).map((m: any) => ({
        id: m.id,
        nickname: m.nickname,
        catColor: m.catColor as CatColor,
        totalCount: m.totalCount === null ? null : Number(m.totalCount),
        state: m.state as PresenceState,
        equipped: m.equipped ?? [],
        isMe: m.id === this.myId,
      })),
    };
  }

  async setMyState(state: Exclude<PresenceState, 'private'>): Promise<void> {
    await this.sb.rpc('set_state', { p_state: state });
  }

  /* ── 쓰다듬 ── */

  async sendPat(toId: string): Promise<'ok' | 'cooldown' | 'error'> {
    const { data, error } = await this.sb.rpc('send_pat', { p_to: toId });
    if (error) return 'error';
    return data === 'ok' ? 'ok' : data === 'cooldown' ? 'cooldown' : 'error';
  }

  async getPats(): Promise<PatEntry[]> {
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await this.sb
      .from('pats')
      .select('id, created_at, from_profile, profiles!pats_from_profile_fkey(nickname)')
      .eq('to_profile', this.myId!)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(100);
    return (data ?? []).map((r: any) => {
      const at = new Date(r.created_at).getTime();
      return {
        id: r.id,
        fromNickname: r.profiles?.nickname ?? '누군가',
        bucket: timeBucketOf(new Date(at)),
        dayLabel: dayLabelOf(at),
        at,
      };
    });
  }

  /* ── 별가루/사물함 ── */

  async recordActivity(steps: number, touches: number): Promise<{ granted: number }> {
    const { data, error } = await this.sb.rpc('record_activity', {
      p_steps: steps, p_touches: touches,
    });
    if (error) return { granted: 0 };
    const granted = (data as any)?.granted ?? 0;
    if (granted > 0) this.emitter.emit('wallet');
    this.emitter.emit('members');
    return { granted };
  }

  async getWallet(): Promise<Wallet> {
    const { data } = await this.sb
      .from('wallets').select('*').eq('profile_id', this.myId!).maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    const sameDay = data?.last_earned_date === today;
    return {
      balance: data?.balance ?? 0,
      earnedToday: sameDay ? data?.earned_today ?? 0 : 0,
      dailyCap: EARN.dailyCap,
    };
  }

  async openBox(): Promise<OpenBoxResult> {
    const { data, error } = await this.sb.rpc('open_box');
    if (error) return { result: 'insufficient' };
    const r = data as any;
    if (r.result !== 'ok') return { result: 'insufficient' };
    this.emitter.emit('wallet');
    this.emitter.emit('inventory');
    return {
      result: 'ok', itemId: r.item_id, name: r.name,
      slot: r.slot, rarity: r.rarity, duplicate: r.duplicate, refund: r.refund,
    };
  }

  async getInventory(): Promise<InventoryEntry[]> {
    const { data } = await this.sb
      .from('inventory').select('item_id, equipped').eq('profile_id', this.myId!);
    return (data ?? []).map((r: any) => ({ itemId: r.item_id, equipped: r.equipped }));
  }

  async equip(itemId: string): Promise<void> {
    await this.sb.rpc('equip_item', { p_item_id: itemId });
    this.emitter.emit('inventory');
    this.emitter.emit('members');
  }

  async unequip(slot: string): Promise<void> {
    await this.sb.rpc('unequip_slot', { p_slot: slot });
    this.emitter.emit('inventory');
    this.emitter.emit('members');
  }
}
