import { useEffect, useRef } from 'react';
import { __, sprintf } from '@wordpress/i18n';

function AutoResizeTextarea( { value, onChange, ...props } ) {
	const ref = useRef( null );

	useEffect( () => {
		if ( ref.current ) {
			ref.current.style.height = 'auto';
			ref.current.style.height = `${ ref.current.scrollHeight }px`;
		}
	}, [ value ] );

	return <textarea ref={ ref } value={ value } onChange={ onChange } className="gw-textarea" { ...props } />;
}

export default function PlanEditor( { plan, onUpdate, features = [], onGoToFeaturesTab } ) {
	function set( key, value ) {
		onUpdate( { ...plan, [ key ]: value } );
	}

	const selectedIds = new Set( Array.isArray( plan.features ) ? plan.features : [] );

	const sortedFeatures = [ ...features ].sort( ( a, b ) => {
		const aChecked = selectedIds.has( a.id ) ? 0 : 1;
		const bChecked = selectedIds.has( b.id ) ? 0 : 1;
		return aChecked - bChecked;
	} );

	function toggleFeature( id ) {
		const next = new Set( selectedIds );
		if ( next.has( id ) ) {
			next.delete( id );
		} else {
			next.add( id );
		}
		set( 'features', [ ...next ] );
	}

	function selectAll() {
		set( 'features', features.map( ( f ) => f.id ) );
	}

	function deselectAll() {
		set( 'features', [] );
	}

	return (
		<div>
			<div className="gw-field">
				<label className="gw-label">{ __( 'Plan Name', 'guidwell' ) }</label>
				<input
					type="text"
					className="gw-input"
					value={ plan.name }
					onChange={ ( e ) => set( 'name', e.target.value ) }
					placeholder={ __( 'e.g. Starter', 'guidwell' ) }
				/>
			</div>

			<div className="gw-field">
				<label className="gw-label">{ __( 'Price', 'guidwell' ) }</label>
				<input
					type="text"
					className="gw-input"
					value={ plan.price }
					onChange={ ( e ) => set( 'price', e.target.value ) }
					placeholder={ __( 'e.g. $750/month', 'guidwell' ) }
				/>
			</div>

<div className="gw-field">
				<label className="gw-label">{ __( 'Description', 'guidwell' ) }</label>
				<AutoResizeTextarea
					value={ plan.description }
					onChange={ ( e ) => set( 'description', e.target.value ) }
					placeholder={ __( 'Describe what this plan includes…', 'guidwell' ) }
					rows={ 3 }
				/>
			</div>

			<div className="gw-field">
				<label className="gw-label">{ __( 'Included Features', 'guidwell' ) }</label>
				<p className="gw-field-note" style={ { marginBottom: 12 } }>
					{ __( 'Select the features included in this plan. These appear on the results page and power upsell comparisons.', 'guidwell' ) }
				</p>
				{ features.length === 0 ? (
					<p className="gw-field-note">
						{ __( 'No features in your library yet.', 'guidwell' ) }{ ' ' }
						<button type="button" className="gw-link-btn" onClick={ onGoToFeaturesTab }>
							{ __( 'Go to Features tab', 'guidwell' ) }
						</button>
						{ ' ' }{ __( 'to add features first.', 'guidwell' ) }
					</p>
				) : (
					<>
						<div className="gw-features-controls">
							<button type="button" className="gw-link-btn" onClick={ selectAll }>
								{ __( 'Select all', 'guidwell' ) }
							</button>
							{ ' · ' }
							<button type="button" className="gw-link-btn" onClick={ deselectAll }>
								{ __( 'Deselect all', 'guidwell' ) }
							</button>
						</div>
						<ul className="gw-feature-checklist">
							{ sortedFeatures.map( ( feature ) => (
								<li key={ feature.id } className="gw-feature-checklist__row">
									<label className="gw-feature-checklist__label">
										<input
											type="checkbox"
											checked={ selectedIds.has( feature.id ) }
											onChange={ () => toggleFeature( feature.id ) }
										/>
										<span>{ feature.label }</span>
									</label>
								</li>
							) ) }
						</ul>
						<p className="gw-field-note" style={ { marginTop: 8 } }>
							{ sprintf(
								/* translators: %1$d: selected count, %2$d: total count */
								__( '%1$d of %2$d features selected', 'guidwell' ),
								selectedIds.size,
								features.length
							) }
						</p>
					</>
				) }
			</div>

			<div className="gw-field">
				<label className="gw-label">{ __( 'CTA Button Label', 'guidwell' ) }</label>
				<input
					type="text"
					className="gw-input"
					value={ plan.ctaLabel }
					onChange={ ( e ) => set( 'ctaLabel', e.target.value ) }
					placeholder={ __( 'e.g. Get Started', 'guidwell' ) }
				/>
			</div>

			<div className="gw-field">
				<label className="gw-label">{ __( 'CTA Button URL', 'guidwell' ) }</label>
				<input
					type="url"
					className="gw-input"
					value={ plan.ctaUrl }
					onChange={ ( e ) => set( 'ctaUrl', e.target.value ) }
					placeholder="https://"
				/>
			</div>
		</div>
	);
}
