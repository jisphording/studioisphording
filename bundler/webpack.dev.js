const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge( common, {
    mode: 'development',
    devtool: 'inline-source-map',
	devServer: {
		open: true,
		hot: true,
		liveReload: true,
		static: {
			directory: path.join(__dirname, '/'),
		},
		host: 'studioisphording.test',
		port: 9000,
		proxy: {
			'/': {
				target: {
					host: 'studioisphording.test',
					protocol: 'http:',
				},
				router: () => 'http://studioisphording.test',
				pathRewrite: { '^/': '' },
			},
		},
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
			"Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
		},
	},
});