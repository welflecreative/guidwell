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
	moduleNameMapper: {
		'^@wordpress/i18n$': '<rootDir>/tests/js/__mocks__/@wordpress/i18n.js',
	},
};
