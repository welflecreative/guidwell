import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { __ } from '@wordpress/i18n';

function Toggle( { id, checked, onChange, label, sublabel } ) {
	return (
		<label className="gw-toggle-row" htmlFor={ id }>
			<div className="gw-toggle-text">
				<span className="gw-toggle-label">{ label }</span>
				{ sublabel && <span className="gw-toggle-sublabel">{ sublabel }</span> }
			</div>
			<div className={ `gw-toggle${ checked ? ' gw-toggle--on' : '' }` }>
				<input
					type="checkbox"
					id={ id }
					checked={ checked }
					onChange={ ( e ) => onChange( e.target.checked ) }
					className="gw-toggle__input"
				/>
				<span className="gw-toggle__track" />
			</div>
		</label>
	);
}

function InfoBanner( { children, variant = 'info' } ) {
	const styles = {
		info: { background: '#e8f4fd', borderColor: '#3b82f6' },
		warn: { background: '#fff3cd', borderColor: '#f59e0b' },
	};
	const s = styles[ variant ] || styles.info;
	return (
		<div style={ {
			background:    s.background,
			borderLeft:    `3px solid ${ s.borderColor }`,
			borderRadius:  '6px',
			padding:       '12px 16px',
			marginBottom:  '16px',
			fontSize:      '13px',
			lineHeight:    '1.5',
			color:         '#374151',
		} }>
			{ children }
		</div>
	);
}

export default function NotificationsTab( { apiBase, nonce, onNotify, onSavingChange, saveRef } ) {
	const [ form,       setForm       ] = useState( {
		recipientEmail:      '',
		recipientName:       '',
		senderName:          '',
		senderEmail:         '',
		emailSubject:        '',
		headerText:          '',
		footerText:          '',
		sendOnResult:        false,
		collectVisitorEmail: false,
		useCustomSmtp:       false,
		smtpHost:            '',
		smtpPort:            587,
		smtpUsername:        '',
		smtpPassword:        '',
		smtpEncryption:      'tls',
	} );
	const [ passwordSet,  setPasswordSet  ] = useState( false );
	const [ loading,    setLoading    ] = useState( true );
	const [ testStatus, setTestStatus ] = useState( 'idle' );
	const smtpPanelRef = useRef( null );

	useEffect( () => {
		fetch( `${ apiBase }contact-settings`, { headers: { 'X-WP-Nonce': nonce } } )
			.then( ( r ) => r.ok ? r.json() : Promise.reject() )
			.then( ( data ) => {
				setPasswordSet( !! data.smtpPasswordSet );
				setForm( ( f ) => ( { ...f, ...data, smtpPassword: '' } ) );
				setLoading( false );
			} )
			.catch( () => setLoading( false ) );
	}, [] );

	useEffect( () => {
		const panel = smtpPanelRef.current;
		if ( ! panel ) return;
		if ( form.useCustomSmtp ) {
			requestAnimationFrame( () => {
				if ( smtpPanelRef.current ) {
					smtpPanelRef.current.style.maxHeight = smtpPanelRef.current.scrollHeight + 'px';
				}
			} );
		} else {
			panel.style.maxHeight = '0';
		}
	}, [ form.useCustomSmtp ] );

	function set( key, value ) {
		setForm( ( f ) => ( { ...f, [ key ]: value } ) );
	}

	const handleSave = useCallback( async () => {
		onSavingChange( 'saving' );
		onNotify( null );
		try {
			const res = await fetch( `${ apiBase }contact-settings`, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
				body:    JSON.stringify( form ),
			} );
			if ( ! res.ok ) {
				const err = await res.json().catch( () => ( {} ) );
				throw new Error( err.message || `HTTP ${ res.status }` );
			}
			const data = await res.json();
			setPasswordSet( !! data.smtpPasswordSet );
			onSavingChange( 'success' );
			setTimeout( () => onSavingChange( 'idle' ), 2000 );
		} catch ( err ) {
			onSavingChange( 'error' );
			onNotify( { type: 'error', message: err.message || __( 'Failed to save.', 'guidwell' ) } );
		}
	}, [ form, apiBase, nonce, onNotify, onSavingChange ] );

	useLayoutEffect( () => {
		if ( saveRef ) saveRef.current = handleSave;
	}, [ saveRef, handleSave ] );

	async function handleTestEmail() {
		if ( ! form.recipientEmail ) return;
		setTestStatus( 'sending' );
		try {
			const res = await fetch( `${ apiBase }test-email`, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
				body:    JSON.stringify( {} ),
			} );
			if ( ! res.ok ) throw new Error( `HTTP ${ res.status }` );
			const data = await res.json();
			setTestStatus( `sent:${ data.sentTo }` );
			setTimeout( () => setTestStatus( 'idle' ), 3000 );
		} catch {
			setTestStatus( 'error' );
			setTimeout( () => setTestStatus( 'idle' ), 3000 );
		}
	}

	const testLabel = testStatus === 'sending' ? null
		: testStatus.startsWith( 'sent:' ) ? `${ __( 'Test sent to', 'guidwell' ) } ${ testStatus.slice( 5 ) } ✓`
		: testStatus === 'error'            ? __( 'Send failed — check your settings', 'guidwell' )
		: __( 'Send test email', 'guidwell' );

	const testBtnClass = `gw-btn-test${
		testStatus.startsWith( 'sent:' ) ? ' gw-btn-test--success' :
		testStatus === 'error'           ? ' gw-btn-test--error'   : ''
	}`;

	if ( loading ) {
		return <p style={ { color: 'var(--gw-muted)', padding: '20px 0' } }>{ __( 'Loading…', 'guidwell' ) }</p>;
	}

	return (
		<div className="gw-settings">

			{ /* ── Section 1: Recipient ── */ }
			<div className="gw-settings-section">
				<h3 className="gw-settings-heading">{ __( 'Where to send results', 'guidwell' ) }</h3>

				<div className="gw-field">
					<label className="gw-label">{ __( 'Recipient Email', 'guidwell' ) }</label>
					<p className="gw-field-note">{ __( 'All wizard results will be sent here.', 'guidwell' ) }</p>
					<input type="email" className="gw-input" value={ form.recipientEmail }
						onChange={ ( e ) => set( 'recipientEmail', e.target.value ) } />
				</div>

				<div className="gw-field">
					<label className="gw-label">{ __( 'Recipient Name', 'guidwell' ) }</label>
					<input type="text" className="gw-input" value={ form.recipientName }
						onChange={ ( e ) => set( 'recipientName', e.target.value ) } />
				</div>
			</div>

			{ /* ── Section 2: Email Content ── */ }
			<div className="gw-settings-section">
				<h3 className="gw-settings-heading">{ __( 'Email appearance', 'guidwell' ) }</h3>

				<div className="gw-field">
					<label className="gw-label">{ __( 'Sender Name', 'guidwell' ) }</label>
					<p className="gw-field-note">{ __( 'Displayed as the email sender.', 'guidwell' ) }</p>
					<input type="text" className="gw-input" value={ form.senderName }
						onChange={ ( e ) => set( 'senderName', e.target.value ) } />
				</div>

				<div className="gw-field">
					<label className="gw-label">{ __( 'Sender Email', 'guidwell' ) }</label>
					<p className="gw-field-note">{ __( 'Reply-to address for outgoing emails.', 'guidwell' ) }</p>
					<input type="email" className="gw-input" value={ form.senderEmail }
						onChange={ ( e ) => set( 'senderEmail', e.target.value ) } />
				</div>

				<div className="gw-field">
					<label className="gw-label">{ __( 'Subject Line', 'guidwell' ) }</label>
					<input type="text" className="gw-input" value={ form.emailSubject }
						placeholder={ __( 'New plan recommendation', 'guidwell' ) }
						onChange={ ( e ) => set( 'emailSubject', e.target.value ) } />
				</div>

				<div className="gw-field">
					<label className="gw-label">{ __( 'Header Text', 'guidwell' ) }</label>
					<p className="gw-field-note">{ __( 'Appears at the top of the email.', 'guidwell' ) }</p>
					<input type="text" className="gw-input" value={ form.headerText }
						placeholder={ __( 'Leave blank to show "Guidwell"', 'guidwell' ) }
						onChange={ ( e ) => set( 'headerText', e.target.value ) } />
				</div>

				<div className="gw-field">
					<label className="gw-label">{ __( 'Footer Text', 'guidwell' ) }</label>
					<p className="gw-field-note">{ __( 'Appears at the bottom of the email.', 'guidwell' ) }</p>
					<textarea className="gw-textarea" rows={ 3 } value={ form.footerText }
						onChange={ ( e ) => set( 'footerText', e.target.value ) } />
				</div>
			</div>

			{ /* ── Section 3: Behavior ── */ }
			<div className="gw-settings-section">
				<h3 className="gw-settings-heading">{ __( 'Behavior', 'guidwell' ) }</h3>

				<Toggle
					id="gw-send-on-result"
					checked={ form.sendOnResult }
					onChange={ ( v ) => set( 'sendOnResult', v ) }
					label={ __( 'Auto-send on result', 'guidwell' ) }
					sublabel={ __( 'Sends an email each time a visitor reaches the results screen.', 'guidwell' ) }
				/>

				<Toggle
					id="gw-collect-visitor-email"
					checked={ form.collectVisitorEmail }
					onChange={ ( v ) => set( 'collectVisitorEmail', v ) }
					label={ __( 'Collect visitor email', 'guidwell' ) }
					sublabel={ __( 'Shows an optional email field on the results screen so visitors can receive a copy.', 'guidwell' ) }
				/>
			</div>

			{ /* ── Section 4: SMTP ── */ }
			<div className="gw-settings-section">
				<h3 className="gw-settings-heading">{ __( 'Mail delivery', 'guidwell' ) }</h3>

				<InfoBanner variant="info">
					{ __( 'By default, Guidwell uses your WordPress mail settings (wp_mail). If you use a plugin like WP Mail SMTP or FluentSMTP, those settings apply automatically — no configuration needed here.', 'guidwell' ) }
				</InfoBanner>

				<Toggle
					id="gw-use-custom-smtp"
					checked={ form.useCustomSmtp }
					onChange={ ( v ) => set( 'useCustomSmtp', v ) }
					label={ __( 'Use custom SMTP', 'guidwell' ) }
				/>

				<div className="gw-smtp-panel" ref={ smtpPanelRef } style={ { maxHeight: 0 } }>
					<div className="gw-smtp-panel__inner">

						<div className="gw-field">
							<label className="gw-label">{ __( 'SMTP Host', 'guidwell' ) }</label>
							<input type="text" className="gw-input" value={ form.smtpHost }
								placeholder="smtp.example.com"
								onChange={ ( e ) => set( 'smtpHost', e.target.value ) } />
						</div>

						<div className="gw-field">
							<label className="gw-label">{ __( 'SMTP Port', 'guidwell' ) }</label>
							<input type="number" className="gw-input" value={ form.smtpPort }
								min="1" max="65535"
								onChange={ ( e ) => set( 'smtpPort', parseInt( e.target.value, 10 ) || 587 ) } />
						</div>

						<div className="gw-field">
							<label className="gw-label">{ __( 'Username', 'guidwell' ) }</label>
							<input type="text" className="gw-input" value={ form.smtpUsername }
								autoComplete="off"
								onChange={ ( e ) => set( 'smtpUsername', e.target.value ) } />
						</div>

						<div className="gw-field">
							<label className="gw-label">{ __( 'Password', 'guidwell' ) }</label>
							<input type="password" className="gw-input" value={ form.smtpPassword }
								autoComplete="new-password"
								placeholder={ passwordSet ? __( 'Password saved — enter to change', 'guidwell' ) : '' }
								onChange={ ( e ) => set( 'smtpPassword', e.target.value ) } />
							<p className="gw-field-note" style={ { fontSize: '12px' } }>
								{ __( 'Password is encrypted before saving.', 'guidwell' ) }
							</p>
						</div>

						<div className="gw-field">
							<label className="gw-label">{ __( 'Encryption', 'guidwell' ) }</label>
							<select className="gw-input" value={ form.smtpEncryption }
								onChange={ ( e ) => set( 'smtpEncryption', e.target.value ) }>
								<option value="tls">{ __( 'TLS (recommended)', 'guidwell' ) }</option>
								<option value="ssl">{ __( 'SSL', 'guidwell' ) }</option>
								<option value="none">{ __( 'None', 'guidwell' ) }</option>
							</select>
						</div>

						<InfoBanner variant="warn">
							{ __( 'Custom SMTP affects all outgoing WordPress emails on this site, not just Guidwell. Test carefully before enabling on a production site.', 'guidwell' ) }
						</InfoBanner>

					</div>
				</div>

				{ /* Test email */ }
				<div style={ { marginTop: '16px' } }>
					<button
						type="button"
						className={ testBtnClass }
						onClick={ handleTestEmail }
						disabled={ ! form.recipientEmail || testStatus === 'sending' }
					>
						{ testStatus === 'sending' && <span className="gw-btn-spinner" /> }
						{ testLabel }
					</button>
				</div>
			</div>

		</div>
	);
}
