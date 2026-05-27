import { useState } from 'react';
import { __, sprintf } from '@wordpress/i18n';

export default function FeaturesTab( { features, onFeaturesChange, apiBase, nonce } ) {
	const [ addInput,        setAddInput        ] = useState( '' );
	const [ addError,        setAddError        ] = useState( null );
	const [ editingId,       setEditingId       ] = useState( null );
	const [ editInput,       setEditInput       ] = useState( '' );
	const [ confirmDeleteId, setConfirmDeleteId ] = useState( null );
	const [ saveStatus,      setSaveStatus      ] = useState( 'idle' );

	async function save( newFeatures ) {
		setSaveStatus( 'saving' );
		try {
			const res = await fetch( `${ apiBase }features`, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
				body:    JSON.stringify( newFeatures ),
			} );
			if ( ! res.ok ) throw new Error();
			setSaveStatus( 'saved' );
			setTimeout( () => setSaveStatus( 'idle' ), 1500 );
		} catch {
			setSaveStatus( 'error' );
		}
	}

	function handleAdd() {
		const label = addInput.trim();
		if ( ! label ) return;
		const isDuplicate = features.some(
			( f ) => f.label.toLowerCase() === label.toLowerCase()
		);
		if ( isDuplicate ) {
			setAddError( __( 'This feature already exists.', 'guidwell' ) );
			setTimeout( () => setAddError( null ), 2000 );
			return;
		}
		const newFeature  = { id: `feat_${ Date.now() }`, label };
		const newFeatures = [ ...features, newFeature ];
		onFeaturesChange( newFeatures );
		save( newFeatures );
		setAddInput( '' );
	}

	function handleEditStart( feature ) {
		setEditingId( feature.id );
		setEditInput( feature.label );
		setConfirmDeleteId( null );
	}

	function handleEditConfirm( id ) {
		const label = editInput.trim();
		if ( ! label ) return;
		const newFeatures = features.map( ( f ) => f.id === id ? { ...f, label } : f );
		onFeaturesChange( newFeatures );
		save( newFeatures );
		setEditingId( null );
	}

	function handleEditCancel() {
		setEditingId( null );
	}

	function handleDeleteRequest( id ) {
		setConfirmDeleteId( id );
		setEditingId( null );
	}

	function handleDeleteConfirm( id ) {
		const newFeatures = features.filter( ( f ) => f.id !== id );
		onFeaturesChange( newFeatures );
		save( newFeatures );
		setConfirmDeleteId( null );
	}

	return (
		<div className="gw-features">

			{ /* ── Header ── */ }
			<div className="gw-features-header">
				<div>
					<h2 className="gw-features-title">{ __( 'Feature Library', 'guidwell' ) }</h2>
					<p className="gw-features-subtitle">
						{ __( 'Build a list of features that can be assigned to any plan. Use these to highlight what each plan includes and power upsell comparisons.', 'guidwell' ) }
					</p>
				</div>
				{ saveStatus !== 'idle' && (
					<span className={ `gw-autosave${ saveStatus === 'saved' ? ' gw-autosave--fade' : '' }${ saveStatus === 'error' ? ' gw-autosave--error' : '' }` }>
						{ saveStatus === 'saving' && (
							<>
								<span className="gw-autosave__spinner" aria-hidden="true" />
								{ __( 'Saving…', 'guidwell' ) }
							</>
						) }
						{ saveStatus === 'saved'  && __( 'Saved ✓', 'guidwell' ) }
						{ saveStatus === 'error'  && __( 'Save failed', 'guidwell' ) }
					</span>
				) }
			</div>

			{ /* ── Add feature row ── */ }
			<div className="gw-features-add-row">
				<input
					type="text"
					className="gw-input gw-features-add-input"
					placeholder={ __( 'e.g. Monthly strategy call', 'guidwell' ) }
					value={ addInput }
					maxLength={ 120 }
					onChange={ ( e ) => setAddInput( e.target.value ) }
					onKeyDown={ ( e ) => e.key === 'Enter' && handleAdd() }
				/>
				<button
					type="button"
					className="gw-btn-primary"
					onClick={ handleAdd }
					disabled={ ! addInput.trim() }
				>
					{ __( 'Add Feature', 'guidwell' ) }
				</button>
			</div>
			{ addError && <p className="gw-features-add-error">{ addError }</p> }

			{ /* ── Features list ── */ }
			{ features.length === 0 ? (
				<p className="gw-features-empty">
					{ __( 'No features yet. Add your first feature above.', 'guidwell' ) }
				</p>
			) : (
				<ul className="gw-features-list">
					{ features.map( ( feature, index ) => (
						<li
							key={ feature.id }
							className={ `gw-feature-row${ index === features.length - 1 ? ' gw-feature-row--last' : '' }` }
						>
							{ editingId === feature.id ? (
								<div className="gw-feature-row__edit">
									<input
										type="text"
										className="gw-input gw-feature-row__edit-input"
										value={ editInput }
										maxLength={ 120 }
										autoFocus
										onChange={ ( e ) => setEditInput( e.target.value ) }
										onKeyDown={ ( e ) => {
											if ( e.key === 'Enter'  ) handleEditConfirm( feature.id );
											if ( e.key === 'Escape' ) handleEditCancel();
										} }
									/>
									<button
										type="button"
										className="gw-feature-row__action-btn gw-feature-row__action-btn--confirm"
										onClick={ () => handleEditConfirm( feature.id ) }
										aria-label={ __( 'Confirm edit', 'guidwell' ) }
									>✓</button>
									<button
										type="button"
										className="gw-feature-row__action-btn gw-feature-row__action-btn--cancel"
										onClick={ handleEditCancel }
										aria-label={ __( 'Cancel edit', 'guidwell' ) }
									>✕</button>
								</div>
							) : confirmDeleteId === feature.id ? (
								<div className="gw-feature-row__confirm-delete">
									<span className="gw-feature-row__confirm-text">
										{ __( 'Delete this feature? Plans using it will lose this selection.', 'guidwell' ) }
									</span>
									<div className="gw-feature-row__confirm-btns">
										<button
											type="button"
											className="gw-feature-row__action-btn gw-feature-row__action-btn--delete"
											onClick={ () => handleDeleteConfirm( feature.id ) }
										>
											{ __( 'Confirm', 'guidwell' ) }
										</button>
										<button
											type="button"
											className="gw-feature-row__action-btn gw-feature-row__action-btn--cancel"
											onClick={ () => setConfirmDeleteId( null ) }
										>
											{ __( 'Cancel', 'guidwell' ) }
										</button>
									</div>
								</div>
							) : (
								<>
									<span className="gw-feature-row__label">{ feature.label }</span>
									<div className="gw-feature-row__actions">
										<button
											type="button"
											className="gw-feature-row__edit-btn"
											onClick={ () => handleEditStart( feature ) }
										>
											{ __( 'Edit', 'guidwell' ) }
										</button>
										<button
											type="button"
											className="gw-feature-row__delete-btn"
											onClick={ () => handleDeleteRequest( feature.id ) }
											aria-label={ __( 'Delete feature', 'guidwell' ) }
										>×</button>
									</div>
								</>
							) }
						</li>
					) ) }
				</ul>
			) }

			{ features.length > 0 && (
				<p className="gw-features-count">
					{ sprintf(
						/* translators: %d: number of features */
						__( '%d features in your library', 'guidwell' ),
						features.length
					) }
				</p>
			) }

		</div>
	);
}
