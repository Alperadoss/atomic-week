const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Hermes optimizations
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    mangle: {
      keep_fnames: true,
    },
    output: {
      ascii_only: true,
      quote_keys: true,
      wrap_iife: true,
    },
    sourceMap: {
      includeSources: false,
    },
    toplevel: false,
    warnings: false,
  },
};

// Performance optimizations for Android
config.resolver = {
  ...config.resolver,
  platforms: ["ios", "android", "native", "web"],
};

module.exports = config;
