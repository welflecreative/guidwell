const path = require( 'path' );

module.exports = {
	entry: './public/js/src/index.js',
	output: {
		path: path.resolve( __dirname, 'public/js/dist' ),
		filename: 'wizard.js',
	},
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							[ '@babel/preset-env', { targets: '> 0.5%, last 2 versions, not dead' } ],
							[ '@babel/preset-react', { runtime: 'automatic' } ],
						],
					},
				},
			},
		],
	},
	resolve: {
		extensions: [ '.js', '.jsx' ],
	},
	externals: {},
};
