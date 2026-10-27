const { withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins');

// Trifelle schedules local reminders only. Expo's notification plugin adds APNs
// by default, but push signing requires capabilities unavailable to Personal Teams.
// Register before expo-notifications: Expo runs these mod actions in reverse order.
// Revisit this policy when remote push is introduced.
module.exports = (config) => {
  config = withEntitlementsPlist(config, (result) => {
    delete result.modResults['aps-environment'];
    return result;
  });
  return withInfoPlist(config, (result) => {
    const modes = result.modResults.UIBackgroundModes;
    if (Array.isArray(modes)) {
      const remaining = modes.filter((mode) => mode !== 'remote-notification');
      if (remaining.length) result.modResults.UIBackgroundModes = remaining;
      else delete result.modResults.UIBackgroundModes;
    }
    return result;
  });
};
