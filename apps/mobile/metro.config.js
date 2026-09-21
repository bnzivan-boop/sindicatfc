// SVG из макета Figma (assets/figma/*.svg) импортируются как компоненты react-native-svg —
// цвета заменяются на currentColor в .svgrrc, чтобы подкрашивать иконки по состоянию.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const { transformer, resolver } = config;

config.transformer = { ...transformer, babelTransformerPath: require.resolve('react-native-svg-transformer/expo') };
config.resolver = { ...resolver, assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'), sourceExts: [...resolver.sourceExts, 'svg'] };

module.exports = config;
