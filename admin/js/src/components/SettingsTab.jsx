import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { __ } from '@wordpress/i18n';
import detectThemeColors from '../../../../public/js/src/utils/detectThemeColors';

function detectSiteFonts() {
	const found = new Set();
	if ( document.fonts ) {
		document.fonts.forEach( ( f ) => {
			const name = f.family.replace( /^["']|["']$/g, '' ).trim();
			if ( name ) found.add( name );
		} );
	}
	const webSafe = [ 'Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New', 'Trebuchet MS' ];
	const sorted = [ ...found ].sort();
	webSafe.forEach( ( f ) => { if ( ! found.has( f ) ) sorted.push( f ); } );
	return sorted;
}

function FontRow( { label, helpText, fontKey, sizeKey, settings, onFontChange, onSizeChange, availableFonts } ) {
	return (
		<div className="gw-field">
			<label className="gw-label">{ label }</label>
			{ helpText && <p className="gw-field-note">{ helpText }</p> }
			<div className="gw-font-row">
				<select
					className="gw-select"
					value={ settings[ fontKey ] || '' }
					onChange={ ( e ) => onFontChange( fontKey, e.target.value ) }
					aria-label={ label }
				>
					<option value="">{ __( '— Use Theme Default —', 'guidwell' ) }</option>
					{ availableFonts.map( ( f ) => (
						<option key={ f } value={ f }>{ f }</option>
					) ) }
				</select>
				<div className="gw-font-size-wrap">
					<input
						type="number"
						className="gw-input gw-font-size-input"
						value={ settings[ sizeKey ] || '' }
						onChange={ ( e ) => {
							const v = e.target.value;
							if ( v === '' ) { onSizeChange( sizeKey, '' ); return; }
							const n = parseInt( v, 10 );
							if ( ! isNaN( n ) ) onSizeChange( sizeKey, Math.min( 72, Math.max( 10, n ) ) );
						} }
						placeholder="–"
						min="10"
						max="72"
						aria-label={ `${ label } size` }
					/>
					<span className="gw-font-size-unit">px</span>
				</div>
			</div>
		</div>
	);
}

const {
	tier: TIER_DATA = {},
} = window.guidwellAdminData || {};

const CAN_EXPORT  = TIER_DATA?.features?.json_export?.allowed ?? false;
const CAN_IMPORT  = TIER_DATA?.features?.json_import?.allowed ?? false;
const UPGRADE_URL = TIER_DATA?.upgrade_url || 'https://welflecreative.com/guidwell';

const COLOR_FIELDS = [
	{
		key:      'primaryColor',
		label:    __( 'Primary Color', 'guidwell' ),
	},
	{
		key:      'primaryDark',
		label:    __( 'Primary Dark', 'guidwell' ),
		helpText: __( 'Used for hover states.', 'guidwell' ),
	},
	{
		key:   'backgroundColor',
		label: __( 'Background', 'guidwell' ),
	},
	{
		key:   'cardBackground',
		label: __( 'Card Background', 'guidwell' ),
	},
];

// Maps importStep → progress bar fill percentage.
const STEP_PCT = { reading: 33, ready: 66, applying: 90, done: 100 };

function isValidHex( val ) {
	return /^#[0-9a-fA-F]{6}$/.test( val );
}

function ColorRow( { field, value, onChange, dimmed } ) {
	const [ hexInput, setHexInput ] = useState( value || '' );
	const [ hexError, setHexError ] = useState( false );

	useEffect( () => {
		setHexInput( value || '' );
		setHexError( false );
	}, [ value ] );

	function handleHexChange( e ) {
		const raw = e.target.value;
		setHexInput( raw );
		if ( isValidHex( raw ) ) {
			setHexError( false );
			onChange( raw );
		} else {
			setHexError( raw.length > 0 );
		}
	}

	function handlePickerChange( e ) {
		const val = e.target.value;
		setHexInput( val );
		setHexError( false );
		onChange( val );
	}

	return (
		<div className="gw-field" style={ dimmed ? { opacity: 0.6, pointerEvents: 'none' } : {} }>
			<label className="gw-label">{ field.label }</label>
			{ field.helpText && <p className="gw-field-note">{ field.helpText }</p> }
			<div className="gw-color-row">
				<input
					type="color"
					className="gw-color-picker"
					value={ isValidHex( value ) ? value : '#000000' }
					onChange={ handlePickerChange }
					aria-label={ field.label }
					tabIndex={ dimmed ? -1 : 0 }
				/>
				<input
					type="text"
					className={ `gw-input gw-color-hex${ hexError ? ' gw-input--error' : '' }` }
					value={ hexInput }
					onChange={ handleHexChange }
					placeholder="#000000"
					maxLength={ 7 }
					tabIndex={ dimmed ? -1 : 0 }
				/>
				<span
					className="gw-color-swatch"
					style={ { backgroundColor: isValidHex( value ) ? value : 'transparent' } }
					aria-hidden="true"
				/>
			</div>
			{ dimmed && (
				<p className="gw-field-note gw-field-note--theme">
					{ __( 'Controlled by theme detection', 'guidwell' ) }
				</p>
			) }
		</div>
	);
}

export default function SettingsTab( {
	initialSettings,
	apiBase,
	nonce,
	onNotify,
	onSavingChange,
	saveRef,
	config,
	onConfigChange,
	features = [],
	onFeaturesImport,
} ) {
	const [ settings,        setSettings        ] = useState( initialSettings || {} );
	const [ manualSettings,  setManualSettings  ] = useState( initialSettings || {} );
	const [ useThemeColors,  setUseThemeColors  ] = useState( !! initialSettings?.useThemeColors );
	const [ detectionResult, setDetectionResult ] = useState( undefined );
	const [ availableFonts,  setAvailableFonts  ] = useState( [] );
	const [ importStep,      setImportStep      ] = useState( null ); // null|'reading'|'ready'|'applying'|'done'
	const [ importPreview,   setImportPreview   ] = useState( null ); // { questions, plans, features }
	const detectionRan  = useRef( false );

	useEffect( () => {
		if ( detectionRan.current ) return;
		detectionRan.current = true;
		setDetectionResult( detectThemeColors() );
		( document.fonts ? document.fonts.ready : Promise.resolve() ).then( () => {
			setAvailableFonts( detectSiteFonts() );
		} );
	}, [] );

	// Register this tab's save function with the global save button.
	const handleSave = useCallback( async () => {
		onSavingChange( 'saving' );
		onNotify( null );

		try {
			const payload = { ...settings, useThemeColors };
			const res = await fetch( `${ apiBase }settings`, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
				body:    JSON.stringify( payload ),
			} );

			if ( ! res.ok ) {
				const err = await res.json().catch( () => ( {} ) );
				throw new Error( err.message || `HTTP ${ res.status }` );
			}

			onSavingChange( 'success' );
			setTimeout( () => onSavingChange( 'idle' ), 2000 );
		} catch ( err ) {
			onSavingChange( 'error' );
			onNotify( { type: 'error', message: err.message || __( 'Failed to save settings.', 'guidwell' ) } );
		}
	}, [ settings, useThemeColors, apiBase, nonce, onNotify, onSavingChange ] );

	useLayoutEffect( () => {
		if ( saveRef ) saveRef.current = handleSave;
	}, [ saveRef, handleSave ] );

	function handleSettingChange( key, value ) {
		setSettings(       ( s ) => ( { ...s, [ key ]: value } ) );
		setManualSettings( ( s ) => ( { ...s, [ key ]: value } ) );
	}

	function handleUseThemeToggle( checked ) {
		setUseThemeColors( checked );
		if ( checked && detectionResult ) {
			setSettings( ( s ) => ( {
				...s,
				primaryColor:    detectionResult.primaryColor    || s.primaryColor,
				backgroundColor: detectionResult.backgroundColor || s.backgroundColor,
			} ) );
		} else {
			setSettings( manualSettings );
		}
	}

	// ── Export ───────────────────────────────────────────────────────────────

	function handleExport() {
		const filename = `guidwell-wizard-${ new Date().toISOString().slice( 0, 10 ) }.json`;
		const exportData = { ...config, features };
		const blob = new Blob( [ JSON.stringify( exportData, null, 2 ) ], { type: 'application/json' } );
		const url  = URL.createObjectURL( blob );
		const a    = document.createElement( 'a' );
		a.href     = url;
		a.download = filename;
		document.body.appendChild( a );
		a.click();
		document.body.removeChild( a );
		URL.revokeObjectURL( url );
	}

	// ── Import ───────────────────────────────────────────────────────────────

	function handleImportFile( e ) {
		const file = e.target.files[ 0 ];
		if ( ! file ) return;

		setImportStep( 'reading' );
		setImportPreview( null );

		const reader = new FileReader();
		reader.onload = ( evt ) => {
			try {
				const data = JSON.parse( evt.target.result );
				if ( ! Array.isArray( data.questions ) || ! Array.isArray( data.plans ) ) {
					throw new Error( __( 'Invalid file — missing questions or plans.', 'guidwell' ) );
				}
				setImportPreview( {
					questions: data.questions,
					plans:     data.plans,
					features:  Array.isArray( data.features ) ? data.features : [],
					_raw:      data,
				} );
				setImportStep( 'ready' );
			} catch ( err ) {
				setImportStep( null );
				onNotify( { type: 'error', message: err.message || __( 'Could not read the JSON file.', 'guidwell' ) } );
			}
		};
		reader.readAsText( file );

		// Reset input so the same file can be re-selected.
		e.target.value = '';
	}

	function handleCancelImport() {
		setImportStep( null );
		setImportPreview( null );
	}

	async function handleConfirmImport() {
		if ( ! importPreview ) return;
		setImportStep( 'applying' );

		const { _raw, features: importedFeatures } = importPreview;
		// Strip `features` (stored separately) and `_imported` (would gate future builder saves via PHP tier check).
		const { features: _f, _imported: _i, ...configData } = _raw;
		onConfigChange( configData );

		if ( importedFeatures.length > 0 && onFeaturesImport ) {
			await onFeaturesImport( importedFeatures );
		}

		setImportStep( 'done' );
		onNotify( {
			type:    'success',
			message: __( 'Wizard imported — review the builder above and click Save when ready.', 'guidwell' ),
		} );

		setTimeout( () => {
			setImportStep( null );
			setImportPreview( null );
		}, 1200 );
	}

	// ── Render helpers ───────────────────────────────────────────────────────

	const detectionPending = detectionResult === undefined;
	const detected         = detectionResult !== null && detectionResult !== undefined;
	const progressPct      = importStep ? ( STEP_PCT[ importStep ] ?? 0 ) : 0;

	// Build feature label lookup for the preview.
	function featLabel( id, featureLib ) {
		return featureLib.find( ( f ) => f.id === id )?.label || id;
	}

	return (
		<div className="gw-settings">

			{ /* ── Section 1: Theme Colors ── */ }
			<div className="gw-settings-section">
				<h3 className="gw-settings-heading">{ __( 'Theme Colors', 'guidwell' ) }</h3>
				<p className="gw-settings-subheading">
					{ __( 'Automatically inherit colors from your active WordPress theme.', 'guidwell' ) }
				</p>

				{ ! detectionPending && (
					<div
						className="gw-detection-badge"
						style={ detected
							? { background: '#d1e7dd', color: '#0a3622' }
							: { background: '#fef3cd', color: '#856404' }
						}
					>
						{ detected
							? ( detectionResult.detectionMethod === 'css-vars'
								? __( 'Theme colors detected via CSS variables ✓', 'guidwell' )
								: __( 'Theme colors estimated from page styles ✓ — review the values below.', 'guidwell' )
							)
							: __( 'No theme colors detected automatically.', 'guidwell' )
						}
					</div>
				) }

				<div className={ `gw-checkbox-row${ ! detected ? ' gw-checkbox-row--disabled' : '' }` }>
					<input
						type="checkbox"
						id="gw-use-theme-colors"
						checked={ useThemeColors }
						disabled={ ! detected }
						onChange={ ( e ) => handleUseThemeToggle( e.target.checked ) }
						title={ ! detected
							? __( 'Enable this after ensuring your theme uses CSS custom properties.', 'guidwell' )
							: undefined
						}
					/>
					<label
						htmlFor="gw-use-theme-colors"
						title={ ! detected
							? __( 'Enable this after ensuring your theme uses CSS custom properties.', 'guidwell' )
							: undefined
						}
					>
						{ __( 'Use Theme Colors', 'guidwell' ) }
					</label>
				</div>
			</div>

			{ /* ── Section 2: Manual Colors ── */ }
			<div className="gw-settings-section">
				<h3 className="gw-settings-heading">{ __( 'Manual Colors', 'guidwell' ) }</h3>

				{ COLOR_FIELDS.map( ( field ) => (
					<ColorRow
						key={ field.key }
						field={ field }
						value={ settings[ field.key ] || '' }
						onChange={ ( val ) => handleSettingChange( field.key, val ) }
						dimmed={ useThemeColors }
					/>
				) ) }
			</div>

			{ /* ── Section 3: Typography ── */ }
			<div className="gw-settings-section">
				<h3 className="gw-settings-heading">{ __( 'Typography', 'guidwell' ) }</h3>
				<p className="gw-settings-subheading">
					{ __( "Override the fonts and sizes used in the wizard. Leave blank to inherit your theme's font.", 'guidwell' ) }
				</p>
				<FontRow
					label={ __( 'Heading Font', 'guidwell' ) }
					helpText={ __( 'Applied to question text. Size default: 26px.', 'guidwell' ) }
					fontKey="headingFont"
					sizeKey="headingFontSize"
					settings={ settings }
					onFontChange={ handleSettingChange }
					onSizeChange={ handleSettingChange }
					availableFonts={ availableFonts }
				/>
				<FontRow
					label={ __( 'Body Font', 'guidwell' ) }
					helpText={ __( 'Applied to answer cards and body text. Size default: 16px.', 'guidwell' ) }
					fontKey="bodyFont"
					sizeKey="bodyFontSize"
					settings={ settings }
					onFontChange={ handleSettingChange }
					onSizeChange={ handleSettingChange }
					availableFonts={ availableFonts }
				/>
			</div>

			{ /* ── Section 4: Backup & Transfer ── */ }
			<div className="gw-settings-section gw-settings-section--transfer">
				<h3 className="gw-settings-heading">{ __( 'Backup & Transfer', 'guidwell' ) }</h3>
				<p className="gw-settings-subheading">
					{ __( 'Export your wizard (including questions, plans, and features) as a JSON file. Import a previously exported file to restore or duplicate a wizard.', 'guidwell' ) }
				</p>

				<div className="gw-transfer-row">

					{ /* Export */ }
					<div className="gw-transfer-card">
						<p className="gw-transfer-card__label">{ __( 'Export', 'guidwell' ) }</p>
						<p className="gw-transfer-card__desc">
							{ __( 'Downloads a .json file of your wizard — includes questions, plans, and your features library.', 'guidwell' ) }
						</p>
						{ CAN_EXPORT ? (
							<button className="gw-btn-secondary" onClick={ handleExport } disabled={ ! config }>
								{ __( '↓ Download wizard.json', 'guidwell' ) }
							</button>
						) : (
							<div className="gw-tier-gate">
								<span className="gw-tier-gate__icon" aria-hidden="true">🔒</span>
								<span className="gw-tier-gate__text">{ __( 'Starter plan required', 'guidwell' ) }</span>
								<a href={ UPGRADE_URL } target="_blank" rel="noreferrer" className="gw-tier-gate__link">
									{ __( 'Upgrade →', 'guidwell' ) }
								</a>
							</div>
						) }
					</div>

					{ /* Import */ }
					<div className="gw-transfer-card">
						<p className="gw-transfer-card__label">{ __( 'Import', 'guidwell' ) }</p>
						<p className="gw-transfer-card__desc">
							{ __( 'Loads a wizard from a .json file. Review the preview before confirming.', 'guidwell' ) }
						</p>
						{ CAN_IMPORT ? (
							<label className={ `gw-btn-secondary gw-btn-file${ importStep ? ' gw-btn-file--disabled' : '' }` }>
								{ __( '↑ Choose JSON file…', 'guidwell' ) }
								<input
									type="file"
									accept=".json,application/json"
									className="gw-file-input"
									onChange={ handleImportFile }
									disabled={ !! importStep }
								/>
							</label>
						) : (
							<div className="gw-tier-gate">
								<span className="gw-tier-gate__icon" aria-hidden="true">🔒</span>
								<span className="gw-tier-gate__text">{ __( 'Pro plan required', 'guidwell' ) }</span>
								<a href={ UPGRADE_URL } target="_blank" rel="noreferrer" className="gw-tier-gate__link">
									{ __( 'Upgrade →', 'guidwell' ) }
								</a>
							</div>
						) }
					</div>

				</div>

				{ /* ── Import progress bar ── */ }
				{ importStep && (
					<div className="gw-import-progress">
						<div className="gw-import-progress__steps">
							<span className={ `gw-import-step${ importStep === 'reading'  ? ' gw-import-step--active' : progressPct > 33  ? ' gw-import-step--done' : '' }` }>
								{ __( 'Reading', 'guidwell' ) }
							</span>
							<span className="gw-import-step__divider" />
							<span className={ `gw-import-step${ importStep === 'ready'    ? ' gw-import-step--active' : progressPct > 66  ? ' gw-import-step--done' : '' }` }>
								{ __( 'Preview', 'guidwell' ) }
							</span>
							<span className="gw-import-step__divider" />
							<span className={ `gw-import-step${ importStep === 'applying' ? ' gw-import-step--active' : importStep === 'done' ? ' gw-import-step--done' : '' }` }>
								{ importStep === 'done' ? __( 'Applied ✓', 'guidwell' ) : __( 'Apply', 'guidwell' ) }
							</span>
						</div>
						<div className="gw-import-progress__bar">
							<div
								className="gw-import-progress__fill"
								style={ { width: `${ progressPct }%` } }
							/>
						</div>
					</div>
				) }

				{ /* ── Import preview ── */ }
				{ importStep === 'ready' && importPreview && (
					<div className="gw-import-preview">
						<h4 className="gw-import-preview__heading">{ __( 'Import Preview', 'guidwell' ) }</h4>

						<div className="gw-import-preview__grid">

							<div className="gw-import-preview__col">
								<p className="gw-import-preview__label">
									{ __( 'Questions', 'guidwell' ) }
									<span className="gw-import-preview__count">{ importPreview.questions.length }</span>
								</p>
								<ul className="gw-import-preview__list">
									{ importPreview.questions.slice( 0, 4 ).map( ( q, i ) => (
										<li key={ i }>
											{ q.text
												? q.text.slice( 0, 50 ) + ( q.text.length > 50 ? '…' : '' )
												: <em>{ __( '(untitled)', 'guidwell' ) }</em>
											}
										</li>
									) ) }
									{ importPreview.questions.length > 4 && (
										<li className="gw-import-preview__more">
											+{ importPreview.questions.length - 4 } { __( 'more', 'guidwell' ) }
										</li>
									) }
								</ul>
							</div>

							<div className="gw-import-preview__col">
								<p className="gw-import-preview__label">
									{ __( 'Plans', 'guidwell' ) }
									<span className="gw-import-preview__count">{ importPreview.plans.length }</span>
								</p>
								<ul className="gw-import-preview__list">
									{ importPreview.plans.map( ( p, i ) => {
										const planFeats = ( p.features || [] );
										const lib       = importPreview.features;
										return (
											<li key={ i }>
												<strong>{ p.name || __( '(untitled)', 'guidwell' ) }</strong>
												{ planFeats.length > 0 && (
													<span className="gw-import-preview__feat-list">
														{ planFeats.slice( 0, 3 ).map( ( id ) => featLabel( id, lib ) ).join( ', ' ) }
														{ planFeats.length > 3 && ` +${ planFeats.length - 3 }` }
													</span>
												) }
											</li>
										);
									} ) }
								</ul>
							</div>

							{ importPreview.features.length > 0 && (
								<div className="gw-import-preview__col">
									<p className="gw-import-preview__label">
										{ __( 'Features', 'guidwell' ) }
										<span className="gw-import-preview__count">{ importPreview.features.length }</span>
									</p>
									<ul className="gw-import-preview__list">
										{ importPreview.features.slice( 0, 5 ).map( ( f, i ) => (
											<li key={ i }>{ f.label }</li>
										) ) }
										{ importPreview.features.length > 5 && (
											<li className="gw-import-preview__more">
												+{ importPreview.features.length - 5 } { __( 'more', 'guidwell' ) }
											</li>
										) }
									</ul>
								</div>
							) }

						</div>

						<div className="gw-import-preview__actions">
							<button
								type="button"
								className="gw-btn-secondary"
								onClick={ handleCancelImport }
							>
								{ __( 'Cancel', 'guidwell' ) }
							</button>
							<button
								type="button"
								className="gw-btn-save"
								onClick={ handleConfirmImport }
							>
								{ __( 'Confirm Import →', 'guidwell' ) }
							</button>
						</div>
					</div>
				) }

			</div>

		</div>
	);
}
