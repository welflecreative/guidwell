// Pass-through mock: __ returns the string as-is so test assertions can match literal English.
module.exports = {
	__: ( str ) => str,
	_n: ( single, plural, count ) => ( count === 1 ? single : plural ),
	_x: ( str ) => str,
};
