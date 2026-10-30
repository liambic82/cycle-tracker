const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// Keep development Metro networking; packaged Release variants are offline.
// Local notifications use NotificationsService, not Firebase's remote services.
const badgePermissions = [
  'com.sec.android.provider.badge.permission.READ',
  'com.sec.android.provider.badge.permission.WRITE',
  'com.htc.launcher.permission.READ_SETTINGS',
  'com.htc.launcher.permission.UPDATE_SHORTCUT',
  'com.sonyericsson.home.permission.BROADCAST_BADGE',
  'com.sonymobile.home.permission.PROVIDER_INSERT_BADGE',
  'com.anddoes.launcher.permission.UPDATE_COUNT',
  'com.majeur.launcher.permission.UPDATE_BADGE',
  'com.huawei.android.launcher.permission.CHANGE_BADGE',
  'com.huawei.android.launcher.permission.READ_SETTINGS',
  'com.huawei.android.launcher.permission.WRITE_SETTINGS',
  'android.permission.READ_APP_BADGE',
  'com.oppo.launcher.permission.READ_SETTINGS',
  'com.oppo.launcher.permission.WRITE_SETTINGS',
  'me.everything.badger.permission.BADGE_COUNT_READ',
  'me.everything.badger.permission.BADGE_COUNT_WRITE',
];
const releaseManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
  <uses-permission android:name="android.permission.INTERNET" tools:node="remove" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" tools:node="remove" />
  <uses-permission android:name="com.google.android.c2dm.permission.RECEIVE" tools:node="remove" />
  <uses-permission android:name="com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE" tools:node="remove" />
${badgePermissions.map((name) => `  <uses-permission android:name="${name}" tools:node="remove" />`).join('\n')}
  <application android:usesCleartextTraffic="false" tools:replace="android:usesCleartextTraffic">
    <provider android:name="com.google.firebase.provider.FirebaseInitProvider" tools:node="remove" />
    <receiver android:name="com.google.firebase.iid.FirebaseInstanceIdReceiver" tools:node="remove" />
    <service android:name="com.google.firebase.messaging.FirebaseMessagingService" tools:node="remove" />
    <service android:name="expo.modules.notifications.service.ExpoFirebaseMessagingService" tools:node="remove" />
  </application>
</manifest>
`;
const domains = [
  'root',
  'file',
  'database',
  'sharedpref',
  'external',
  'device_root',
  'device_file',
  'device_database',
  'device_sharedpref',
];
const exclusions = domains
  .map((domain) => `    <exclude domain="${domain}" path="." />`)
  .join('\n');

module.exports = (config) => {
  config = withAndroidManifest(config, (result) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(result.modResults);
    app.$['android:allowBackup'] = 'false';
    app.$['android:fullBackupContent'] = '@xml/trifelle_backup_rules';
    app.$['android:dataExtractionRules'] = '@xml/trifelle_data_extraction_rules';
    for (const name of [
      'firebase_messaging_auto_init_enabled',
      'firebase_analytics_collection_enabled',
      'firebase_data_collection_default_enabled',
    ]) {
      app['meta-data'] = (app['meta-data'] ?? []).filter((item) => item.$['android:name'] !== name);
      app['meta-data'].push({ $: { 'android:name': name, 'android:value': 'false' } });
    }
    return result;
  });
  return withDangerousMod(config, [
    'android',
    async (result) => {
      const root = result.modRequest.platformProjectRoot;
      const xml = path.join(root, 'app/src/main/res/xml');
      const release = path.join(root, 'app/src/release');
      await fs.mkdir(xml, { recursive: true });
      await fs.mkdir(release, { recursive: true });
      await fs.writeFile(
        path.join(xml, 'trifelle_backup_rules.xml'),
        `<?xml version="1.0" encoding="utf-8"?>\n<full-backup-content>\n${exclusions}\n</full-backup-content>\n`,
      );
      await fs.writeFile(
        path.join(xml, 'trifelle_data_extraction_rules.xml'),
        `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n  <cloud-backup>\n${exclusions}\n  </cloud-backup>\n  <device-transfer>\n${exclusions}\n  </device-transfer>\n</data-extraction-rules>\n`,
      );
      await fs.writeFile(path.join(release, 'AndroidManifest.xml'), releaseManifest);
      return result;
    },
  ]);
};
