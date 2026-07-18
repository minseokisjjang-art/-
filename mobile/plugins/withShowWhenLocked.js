const { withAndroidManifest } = require('expo/config-plugins');

/*
 * Android: 잠금화면 위에서 앱이 보이게 하는 설정.
 *  - showWhenLocked: 잠금 상태에서 전원 버튼을 눌러 화면을 켜면,
 *    잠금화면 대신(위에) 이 앱이 그대로 표시된다 (알람/전화 앱과 같은 방식)
 *  - turnScreenOn: 앱이 앞에 있을 때 화면이 켜지도록 허용
 * 사용 시나리오: 앱을 켠 채 책상에 세워두기 → 화면이 꺼졌다 켜져도 교실이 바로 보임.
 * iOS는 OS 정책상 서드파티 앱이 잠금화면 위에 그려질 수 없다 (개발 빌드에서만 유효한 설정).
 */
module.exports = function withShowWhenLocked(config) {
  return withAndroidManifest(config, cfg => {
    const app = cfg.modResults.manifest.application?.[0];
    const activity = app?.activity?.find(
      a => a.$['android:name'] === '.MainActivity',
    );
    if (activity) {
      activity.$['android:showWhenLocked'] = 'true';
      activity.$['android:turnScreenOn'] = 'true';
    }
    return cfg;
  });
};
