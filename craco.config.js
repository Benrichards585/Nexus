const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // pptxgenjs uses dynamic import('node:fs') for Node.js file writing.
      // In the browser it uses Blob instead, but webpack still tries to resolve node:fs.
      // Register a scheme handler to stub node: URIs.
      webpackConfig.module.rules.unshift({
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      });

      webpackConfig.plugins.push(
        new (class NodeSchemePlugin {
          apply(compiler) {
            compiler.hooks.normalModuleFactory.tap('NodeSchemePlugin', (nmf) => {
              nmf.hooks.beforeResolve.tap('NodeSchemePlugin', (resolveData) => {
                if (resolveData.request && resolveData.request.startsWith('node:')) {
                  resolveData.request = resolveData.request.slice(5);
                }
              });
            });
          }
        })()
      );

      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        buffer: false,
        util: false,
        crypto: false,
        os: false,
      };

      return webpackConfig;
    },
  },
};
