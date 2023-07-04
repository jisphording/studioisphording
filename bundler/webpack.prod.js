const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = merge( common, {
    mode: 'production',
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin({
            parallel: true,
            terserOptions: {
                ecma: undefined,
                parse: {},
                compress: true,
                mangle: true, // Note `mangle.properties` is `false` by default.
                module: false,
            },
            extractComments: true,
          })]
    },
});