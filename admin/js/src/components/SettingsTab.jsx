import { useState } from 'react';
import { __ } from '@wordpress/i18n';

const FIELDS = [
	{ key: 'primaryColor',    label: __( 'Primary Color',     'guidwell' ) },
	{ key: 'primaryDark',     label: __( 'Primary Dark',      'guidwell' ) },
	{ key: 'backgroundColor', label: __( 'Background Color',  'guidwell' ) },
	{ key: 'cardBackground',  label: __( 'Card Background',   'guidwell' ) },
];

export default function SettingsTab( { initialSettings, apiBase, nonce, onNotify } ) {
	const [ settings, setSettings ] = useState( initialSettings || {} );
	const [ saving,   setSaving   ] = useState( false );

	function setColor( key, value ) {
		setSettings( ( s ) => ( { ...s, [ key ]: value } ) );
	}

	async function handleSave() {
		setSaving( true );
		onNotify( null );

		try {
			const res = await fetch( `${ apiBase }settings`, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
				body:    JSON.stringify( settings ),
			} );

			if ( ! res.ok ) {
				const err = await res.json().catch( () => ( {} ) );
				throw new Error( err.message || `HTTP ${ res.status }` );
			}

			onNotify( { type: 'success', message: __( 'Settings saved.', 'guidwell' ) } );
		} catch ( err ) {
			onNotify( { type: 'error', message: err.message || __( 'Failed to save settings.', 'guidwell' ) } );
		} finally {
			setSaving( false );
		}
	}

	return (
		<div className="gw-settings">
			{ FIELDS.map( ( { key, label } ) => (
				<div className="gw-field" key={ key }>
					<label className="gw-label">{ label }</label>
					<div className="gw-color-row">
						<input
							type="color"
							className="gw-color-picker"
							value={ settings[ key ] || '#000000' }
							onChange={ ( e ) => setColor( key, e.target.value ) }
							aria-label={ label }
						/>
						<input
							type="text"
							className={ `gw-input gw-color-hex` }
							value={ settings[ key ] || '' }
							onChange={ ( e ) => setColor( key, e.target.value ) }
							placeholder="#000000"
							maxLength={ 7 }
						/>
					</div>
				</div>
			) ) }

			<button className="gw-btn-primary" onClick={ handleSave } disabled={ saving }>
				{ saving ? __( 'Saving…', 'guidwell' ) : __( 'Save Settings', 'guidwell' ) }
			</button>
		</div>
	);
}
