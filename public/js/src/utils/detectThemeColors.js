function rgbToHex( r, g, b ) {
	return '#' + [ r, g, b ].map( ( v ) => v.toString( 16 ).padStart( 2, '0' ) ).join( '' );
}

function parseRgb( value ) {
	const m = value.match( /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/ );
	if ( ! m ) return null;
	const r = parseInt( m[ 1 ], 10 );
	const g = parseInt( m[ 2 ], 10 );
	const b = parseInt( m[ 3 ], 10 );
	if ( ( r === 0 && g === 0 && b === 0 ) || ( r === 255 && g === 255 && b === 255 ) ) return null;
	return rgbToHex( r, g, b );
}

function cssVar( style, name ) {
	const val = style.getPropertyValue( name ).trim();
	return val && val !== '' ? val : null;
}

/**
 * Attempts to detect the active theme's color palette at runtime.
 * Checks CSS custom properties from WordPress core, Blocksy, Elementor,
 * Kadence, Astra, and GeneratePress before falling back to computed styles.
 *
 * @returns {{ primaryColor: string|null, backgroundColor: string|null, textColor: string|null, detectionMethod: string, detectedCount: number } | null}
 */
export default function detectThemeColors() {
	const style = getComputedStyle( document.documentElement );

	// ── Step 1: CSS custom properties ────────────────────────────────────────
	// Listed from most-specific to most-generic. First non-empty value wins.

	const primaryCandidates = [
		// WordPress theme.json standard
		'--wp--preset--color--primary',
		'--wp--preset--color--vivid-cyan-blue',
		'--wp--preset--color--luminous-vivid-amber',
		// Elementor global colors
		'--e-global-color-primary',
		'--e-global-color-accent',
		// Blocksy
		'--theme-palette-color-1',
		'--theme-palette-color-2',
		// Kadence
		'--global-palette1',
		'--global-palette2',
		// Astra
		'--ast-global-color-0',
		'--ast-global-color-1',
		// GeneratePress / generic
		'--accent',
		'--color-primary',
		'--clr-primary',
		'--primary-color',
		'--theme-color',
		'--color-accent',
	];

	const backgroundCandidates = [
		// WordPress theme.json standard
		'--wp--preset--color--base',
		'--wp--preset--color--white',
		// Blocksy (palette slot 8 is the lightest/background color)
		'--theme-palette-color-8',
		// Kadence
		'--global-palette9',
		// Astra
		'--ast-global-color-5',
		// GeneratePress
		'--base-2',
		// Generic
		'--color-base',
		'--background-color',
		'--bg-color',
		'--site-background',
	];

	const textCandidates = [
		// WordPress theme.json standard
		'--wp--preset--color--contrast',
		'--wp--preset--color--foreground',
		// Elementor
		'--e-global-color-text',
		// Blocksy (slots 6–7 are the darker text colors)
		'--theme-palette-color-7',
		'--theme-palette-color-6',
		// Kadence
		'--global-palette8',
		// Astra
		'--ast-global-color-2',
		// GeneratePress
		'--contrast',
		// Generic
		'--color-text',
		'--text-color',
		'--heading-color',
		'--color-heading',
	];

	function firstVar( candidates ) {
		for ( const name of candidates ) {
			const val = cssVar( style, name );
			if ( val ) return val;
		}
		return null;
	}

	let primaryColor    = firstVar( primaryCandidates );
	let backgroundColor = firstVar( backgroundCandidates );
	let textColor       = firstVar( textCandidates );

	const cssVarCount = [ primaryColor, backgroundColor, textColor ].filter( Boolean ).length;

	if ( cssVarCount >= 2 ) {
		return {
			primaryColor,
			backgroundColor,
			textColor,
			detectionMethod: 'css-vars',
			detectedCount:   cssVarCount,
		};
	}

	// ── Step 2: Computed style sampling ──────────────────────────────────────
	// Fallback for themes that don't expose CSS variables.

	if ( ! primaryColor ) {
		const selectors = [
			'.wp-block-button__link',
			'.elementor-button',
			'.wp-element-button',
			'.button',
			'.btn',
			'a.button',
			'input[type="submit"]',
		];
		for ( const sel of selectors ) {
			const el = document.querySelector( sel );
			if ( el ) {
				const hex = parseRgb( getComputedStyle( el ).backgroundColor );
				if ( hex ) { primaryColor = hex; break; }
			}
		}
	}

	if ( ! backgroundColor ) {
		const hex = parseRgb( getComputedStyle( document.body ).backgroundColor );
		if ( hex ) backgroundColor = hex;
	}

	if ( ! textColor ) {
		const el = document.querySelector( 'h1, h2' );
		if ( el ) {
			const hex = parseRgb( getComputedStyle( el ).color );
			if ( hex ) textColor = hex;
		}
	}

	const computedCount = [ primaryColor, backgroundColor, textColor ].filter( Boolean ).length;

	if ( computedCount === 0 ) return null;

	return {
		primaryColor,
		backgroundColor,
		textColor,
		detectionMethod: computedCount >= 2 ? 'computed' : 'none',
		detectedCount:   computedCount,
	};
}
