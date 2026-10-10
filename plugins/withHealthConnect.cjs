const { withGradleProperties } = require('expo/config-plugins');
module.exports = (config) =>
  withGradleProperties(config, (result) => {
    result.modResults = result.modResults.filter((item) => item.key !== 'android.minSdkVersion');
    result.modResults.push({ type: 'property', key: 'android.minSdkVersion', value: '26' });
    return result;
  });
