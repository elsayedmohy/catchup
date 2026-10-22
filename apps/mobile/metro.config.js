// Expo monorepo Metro config: allow importing workspace packages and hoisted
// node_modules from the monorepo root.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
// Keep hierarchical lookup enabled: some Expo dependencies keep their own
// nested node_modules, which the strict resolver would miss.

module.exports = config;
