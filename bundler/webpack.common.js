const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const ASSET_PATH = process.env.ASSET_PATH || 'http://studioisphording.test/assets/bundle/';
//const ASSET_PATH = process.env.ASSET_PATH || 'https://studioisphording.de/assets/bundle/';

module.exports = {
	entry: {
		app: path.resolve(__dirname, './../dev/js/index.js'),
	},
	output: {
		path: path.resolve(__dirname, './../app/assets/bundle/'),
		publicPath: ASSET_PATH,
		filename: '[name].bundle.js',
		clean: true,
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name].css',
			chunkFilename: '[id].css',
		}),

		new CopyWebpackPlugin({
			patterns: [{
				from: path.resolve(__dirname, './../dev/assets/'),
				to: path.resolve(__dirname, './../app/assets/')
			}],
		}),
	],
	module: {
		rules: [
			// JS
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use:
					[
						'babel-loader'
					]
			},
	
			// TS
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},

			// CSS & SCSS
			{
				test: /\.s[ac]ss$/i,
				use: [
					MiniCssExtractPlugin.loader,
					"css-loader",
					"sass-loader",
					'resolve-url-loader', {
						loader: 'sass-loader',
						options: {
							sourceMap: true, 
						}
					}

				],
			},
	
			// Images
			{
				test: /\.(ico|png|jpg|jpeg|gif|svg|webp|tiff)$/i,
				type: "asset/resource",
			},

			// Fonts
			{
				test: /\.(woff|woff2|eot|ttf|otf)$/i,
				type: "asset/resource",
			},

			// Shaders
			{
				test: /\.(glsl|vs|fs|vert|frag)$/,
				exclude: /node_modules/,
				type: 'asset/source',
			}

		],
	}, 
	resolve: {
		extensions: ['.js', '.jsx', '.scss'],
	},
};
