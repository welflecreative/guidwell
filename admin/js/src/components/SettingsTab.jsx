import { useState, useEffect, useRef } from 'react';
import { __ } from '@wordpress/i18n';
import detectThemeColors from '../../../../public/js/src/utils/detectThemeColors';

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

export default function SettingsTab( { initialSettings, apiBase, nonce, onNotify } ) {
	const [ settings,         setSettings         ] = useState( initialSettings || {} );
	const [ manualSettings,   setManualSettings   ] = useState( initialSettings || {} );
	const [ useThemeColors,   setUseThemeColors   ] = useState( !! initialSettings?.useThemeColors );
	const [ detectionResult,  setDetectionResult  ] = useState( undefined );
	const [ saving,           setSaving           ] = useState( false );
	const [ saveStatus,       setSaveStatus       ] = useState( 'idle' );
	const detectionRan = useRef( false );

	useEffect( () => {
		if ( detectionRan.current ) return;
		detectionRan.current = true;
		setDetectionResult( detectThemeColors() );
	}, [] );

	function handleColorChange( key, value ) {
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

	async function handleSave() {
		setSaving( true );
		setSaveStatus( 'saving' );
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

			setSaveStatus( 'success' );
			setTimeout( () => setSaveStatus( 'idle' ), 2000 );
		} catch ( err ) {
			setSaveStatus( 'error' );
			onNotify( { type: 'error', message: err.message || __( 'Failed to save settings.', 'guidwell' ) } );
		} finally {
			setSaving( false );
		}
	}

	const detectionPending = detectionResult === undefined;
	const detected         = detectionResult !== null && detectionResult !== undefined;

	const saveLabel = saveStatus === 'saving' ? null
		: saveStatus === 'success' ? __( 'Saved ✓', 'guidwell' )
		: saveStatus === 'error'   ? __( 'Error — try again', 'guidwell' )
		: __( 'Save Settings', 'guidwell' );

	const saveBtnClass = `gw-btn-save${
		saveStatus === 'success' ? ' gw-btn-save--success' :
		saveStatus === 'error'   ? ' gw-btn-save--error'   : ''
	}`;

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
						onChange={ ( val ) => handleColorChange( field.key, val ) }
						dimmed={ useThemeColors }
					/>
				) ) }
			</div>

			{ /* ── Section 3: Save ── */ }
			<button
				className={ saveBtnClass }
				onClick={ handleSave }
				disabled={ saving }
			>
				{ saving && <span className="gw-btn-spinner" /> }
				{ saveLabel }
			</button>

		</div>
	);
}
