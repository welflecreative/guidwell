module.exports = {
	testEnvironment: 'node',
	testMatch: [ '**/tests/js/**/*.test.js' ],
	transform: {
		'^.+\\.jsx?$': [ 'babel-jest', {
			presets: [
				[ '@babel/preset-env', { targets: { node: 'current' } } ],
				[ '@babel/preset-react', { runtime: 'automatic' } ],
			],
		} ],
	},
};
