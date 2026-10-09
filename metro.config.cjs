const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // tslib 1.x's exports/import wrapper expects a default export that its CommonJS
  // file does not provide under Metro. Use its legacy entry for pdf-lib helpers.
  return context.resolveRequest(
    moduleName === 'tslib' ? { ...context, unstable_enablePackageExports: false } : context,
    moduleName,
    platform,
  );
};

module.exports = config;
