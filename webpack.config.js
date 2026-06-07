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

// WordPress packages are loaded as globals on the page — don't bundle them.
const wpExternals = {
	'@wordpress/blocks':      [ 'wp', 'blocks' ],
	'@wordpress/block-editor': [ 'wp', 'blockEditor' ],
	'@wordpress/components':  [ 'wp', 'components' ],
	'@wordpress/data':        [ 'wp', 'data' ],
	'@wordpress/i18n':        [ 'wp', 'i18n' ],
	'@wordpress/element':     [ 'wp', 'element' ],
};

module.exports = [
	{
		name: 'wizard',
		entry: './public/js/src/index.js',
		output: {
			path:       path.resolve( __dirname, 'public/js/dist' ),
			filename:   'wizard.js',
			publicPath: 'auto',
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
	{
		name: 'block',
		entry: './public/js/src/block/index.js',
		output: {
			path:     path.resolve( __dirname, 'public/js/dist' ),
			filename: 'block.js',
		},
		module: { rules: [ babelRule ] },
		resolve,
		externals: wpExternals,
	},
];
