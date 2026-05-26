const path = require( 'path' );

const babelRule = {
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
};

const resolve = { extensions: [ '.js', '.jsx' ] };

module.exports = [
	{
		name: 'wizard',
		entry: './public/js/src/index.js',
		output: {
			path: path.resolve( __dirname, 'public/js/dist' ),
			filename: 'wizard.js',
		},
		module: { rules: [ babelRule ] },
		resolve,
	},
	{
		name: 'admin',
		entry: './admin/js/src/index.js',
		output: {
			path: path.resolve( __dirname, 'admin/js/dist' ),
			filename: 'admin.js',
		},
		module: { rules: [ babelRule ] },
		resolve,
	},
];
