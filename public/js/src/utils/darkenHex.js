/**
 * Darkens a hex color by reducing HSL lightness by `amount` points.
 * Handles both #rgb and #rrggbb. Returns original hex if parsing fails.
 *
 * @param {string} hex
 * @param {number} amount  Lightness points to subtract (default 15)
 * @returns {string}
 */
export default function darkenHex( hex, amount = 15 ) {
	if ( ! hex || typeof hex !== 'string' ) return hex;

	let clean = hex.replace( '#', '' );
	if ( clean.length === 3 ) {
		clean = clean[ 0 ] + clean[ 0 ] + clean[ 1 ] + clean[ 1 ] + clean[ 2 ] + clean[ 2 ];
	}
	if ( clean.length !== 6 || ! /^[0-9a-fA-F]{6}$/.test( clean ) ) return hex;

	const r = parseInt( clean.slice( 0, 2 ), 16 ) / 255;
	const g = parseInt( clean.slice( 2, 4 ), 16 ) / 255;
	const b = parseInt( clean.slice( 4, 6 ), 16 ) / 255;

	const max  = Math.max( r, g, b );
	const min  = Math.min( r, g, b );
	const diff = max - min;

	let h = 0;
	let s = 0;
	let l = ( max + min ) / 2;

	if ( diff !== 0 ) {
		s = diff / ( 1 - Math.abs( 2 * l - 1 ) );
		switch ( max ) {
			case r: h = ( ( g - b ) / diff + ( g < b ? 6 : 0 ) ) / 6; break;
			case g: h = ( ( b - r ) / diff + 2 ) / 6;                  break;
			case b: h = ( ( r - g ) / diff + 4 ) / 6;                  break;
		}
	}

	l = Math.max( 0.05, l - amount / 100 );

	const c  = ( 1 - Math.abs( 2 * l - 1 ) ) * s;
	const x  = c * ( 1 - Math.abs( ( h * 6 ) % 2 - 1 ) );
	const m  = l - c / 2;

	let r2, g2, b2;
	const sector = Math.floor( h * 6 );
	switch ( sector ) {
		case 0: [ r2, g2, b2 ] = [ c, x, 0 ]; break;
		case 1: [ r2, g2, b2 ] = [ x, c, 0 ]; break;
		case 2: [ r2, g2, b2 ] = [ 0, c, x ]; break;
		case 3: [ r2, g2, b2 ] = [ 0, x, c ]; break;
		case 4: [ r2, g2, b2 ] = [ x, 0, c ]; break;
		default:[ r2, g2, b2 ] = [ c, 0, x ]; break;
	}

	const toHex = ( v ) => Math.round( ( v + m ) * 255 ).toString( 16 ).padStart( 2, '0' );
	return `#${ toHex( r2 ) }${ toHex( g2 ) }${ toHex( b2 ) }`;
}
