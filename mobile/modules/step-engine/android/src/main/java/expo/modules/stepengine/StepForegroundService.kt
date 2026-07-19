package expo.modules.stepengine

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * 잠금화면 걸음 서비스 — 앱이 꺼져 있어도 걸음 칩을 계속 구독해
 * 오늘 걸음을 잠금화면 알림으로 보여준다. (캐시워크와 같은 구조)
 *
 *  - 걸음: TYPE_STEP_COUNTER 배치 구독 (하드웨어 집계라 배터리 부담 거의 없음)
 *  - 기척: 잠금해제(ACTION_USER_PRESENT) 횟수를 세어 앱이 다음에 열릴 때 전달
 *  - 날짜가 바뀌면 '오늘 걸음' 기준점을 자동 리셋, 재부팅하면 칩 리셋을 보정
 */
class StepForegroundService : Service(), SensorEventListener {

  private var sensorManager: SensorManager? = null
  private var unlockReceiver: BroadcastReceiver? = null
  private var lastShownSteps = -1
  private var lastNotifiedAt = 0L

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    running = true
    createChannel()
    try {
      startAsForeground()
    } catch (e: Exception) {
      // 걸음 권한이 아직 없으면 health 타입 시작이 거부될 수 있다 — 조용히 종료
      running = false
      stopSelf()
      return
    }

    sensorManager = getSystemService(Context.SENSOR_SERVICE) as? SensorManager
    val sensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    if (sensor != null) {
      // 최대 5분 배치 — 잠금 중엔 몰아 받고, 화면이 켜지면 flush로 즉시 갱신
      sensorManager?.registerListener(
        this, sensor, SensorManager.SENSOR_DELAY_NORMAL, 5 * 60 * 1_000_000
      )
    }

    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_USER_PRESENT)
      addAction(Intent.ACTION_SCREEN_ON)
    }
    unlockReceiver = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_USER_PRESENT) {
          val prefs = ctx.getSharedPreferences(StepEngineModule.PREFS, Context.MODE_PRIVATE)
          prefs.edit()
            .putInt(
              StepEngineModule.KEY_UNLOCKS,
              prefs.getInt(StepEngineModule.KEY_UNLOCKS, 0) + 1
            )
            .apply()
        }
        // 화면이 켜질 때 배치에 쌓인 걸음을 즉시 반영
        sensorManager?.flush(this@StepForegroundService)
        refreshNotification(force = true)
      }
    }
    if (Build.VERSION.SDK_INT >= 33) {
      registerReceiver(unlockReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      registerReceiver(unlockReceiver, filter)
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

  override fun onDestroy() {
    running = false
    try { sensorManager?.unregisterListener(this) } catch (_: Exception) {}
    try { unlockReceiver?.let { unregisterReceiver(it) } } catch (_: Exception) {}
    super.onDestroy()
  }

  /* ── 걸음 집계 ───────────────────────────────── */

  override fun onSensorChanged(event: SensorEvent) {
    if (event.sensor.type != Sensor.TYPE_STEP_COUNTER) return
    val cum = event.values[0]
    val prefs = getSharedPreferences(StepEngineModule.PREFS, Context.MODE_PRIVATE)
    val today = dayStamp()
    var base = prefs.getFloat(StepEngineModule.KEY_DAY_BASE, -1f)
    val savedDay = prefs.getString(StepEngineModule.KEY_DAY, null)
    val lastCum = prefs.getFloat(StepEngineModule.KEY_LAST_CUM, -1f)

    if (savedDay != today || base < 0f) {
      // 새 날 — 지금 값이 오늘의 출발점
      base = cum
      prefs.edit()
        .putString(StepEngineModule.KEY_DAY, today)
        .putFloat(StepEngineModule.KEY_DAY_BASE, base)
        .apply()
    } else if (lastCum >= 0f && cum < lastCum) {
      // 재부팅 — 칩이 0부터 다시 시작. 오늘 누계가 이어지도록 기준점 보정
      base = cum - (lastCum - base)
      prefs.edit().putFloat(StepEngineModule.KEY_DAY_BASE, base).apply()
    }
    prefs.edit().putFloat(StepEngineModule.KEY_LAST_CUM, cum).apply()

    refreshNotification(todaySteps = (cum - base).toInt())
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

  /* ── 알림 ────────────────────────────────────── */

  private fun startAsForeground() {
    val notification = buildNotification(currentTodaySteps())
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
    } else {
      startForeground(NOTIF_ID, notification)
    }
  }

  private fun refreshNotification(todaySteps: Int? = null, force: Boolean = false) {
    val steps = todaySteps ?: currentTodaySteps() ?: return
    val now = System.currentTimeMillis()
    if (!force && steps - lastShownSteps < 30 && now - lastNotifiedAt < 60_000) return
    lastShownSteps = steps
    lastNotifiedAt = now
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
    try { nm.notify(NOTIF_ID, buildNotification(steps)) } catch (_: Exception) {}
  }

  private fun currentTodaySteps(): Int? {
    val prefs = getSharedPreferences(StepEngineModule.PREFS, Context.MODE_PRIVATE)
    if (prefs.getString(StepEngineModule.KEY_DAY, null) != dayStamp()) return null
    val base = prefs.getFloat(StepEngineModule.KEY_DAY_BASE, -1f)
    val last = prefs.getFloat(StepEngineModule.KEY_LAST_CUM, -1f)
    if (base < 0f || last < 0f) return null
    return (last - base).toInt().coerceAtLeast(0)
  }

  private fun buildNotification(todaySteps: Int?): Notification {
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val pi = if (launch != null) {
      PendingIntent.getActivity(
        this, 0, launch,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    } else null

    val title = if (todaySteps != null && todaySteps >= 0) {
      "오늘 " + String.format(Locale.KOREA, "%,d", todaySteps) + "걸음 🐾"
    } else {
      "고양이가 걸음을 세는 중 🐾"
    }

    val builder = Notification.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText("잘지냥 — 앱을 닫아도 계속 세요")
      .setSmallIcon(applicationInfo.icon)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setShowWhen(false)
    if (pi != null) builder.setContentIntent(pi)
    return builder.build()
  }

  private fun createChannel() {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
    val channel = NotificationChannel(
      CHANNEL_ID, "잠금화면 걸음", NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "잠금화면에서 오늘 걸음을 보여줘요"
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      setShowBadge(false)
    }
    nm.createNotificationChannel(channel)
  }

  private fun dayStamp(): String =
    SimpleDateFormat("yyyyMMdd", Locale.US).format(Date())

  companion object {
    @JvmStatic @Volatile
    var running = false

    private const val CHANNEL_ID = "jjn-lockscreen-steps"
    private const val NOTIF_ID = 7331
  }
}
