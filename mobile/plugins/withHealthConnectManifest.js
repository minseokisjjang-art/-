const { withAndroidManifest } = require('expo/config-plugins');

/*
 * Health Connect 권한 창이 뜨기 위한 필수 매니페스트 선언.
 * 이게 없으면 Android 14+에서 권한 요청이 조용히 거부되거나 응답이 오지 않는다.
 *  - androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE (Android 13 이하)
 *  - VIEW_PERMISSION_USAGE activity-alias (Android 14+)
 */
module.exports = function withHealthConnectManifest(config) {
  return withAndroidManifest(config, cfg => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;

    const mainActivity = app.activity?.find(
      a => a.$['android:name'] === '.MainActivity',
    );
    if (mainActivity) {
      mainActivity['intent-filter'] = mainActivity['intent-filter'] || [];
      const has = JSON.stringify(mainActivity['intent-filter'])
        .includes('ACTION_SHOW_PERMISSIONS_RATIONALE');
      if (!has) {
        mainActivity['intent-filter'].push({
          action: [{ $: { 'android:name': 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE' } }],
        });
      }
    }

    app['activity-alias'] = app['activity-alias'] || [];
    const hasAlias = app['activity-alias'].some(
      a => a.$?.['android:name'] === 'ViewPermissionUsageActivity',
    );
    if (!hasAlias) {
      app['activity-alias'].push({
        $: {
          'android:name': 'ViewPermissionUsageActivity',
          'android:exported': 'true',
          'android:targetActivity': '.MainActivity',
          'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
        },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }],
          category: [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }],
        }],
      });
    }
    return cfg;
  });
};
