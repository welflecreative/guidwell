import { useEffect, useRef } from 'react';
import { __ } from '@wordpress/i18n';

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

export default function PlanEditor( { plan, onUpdate } ) {
	function set( key, value ) {
		onUpdate( { ...plan, [ key ]: value } );
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
				<label className="gw-label">
					{ __( 'Tier', 'guidwell' ) }
					<span className="gw-label-hint">({ __( 'read-only', 'guidwell' ) })</span>
				</label>
				<input
					type="number"
					className="gw-input"
					value={ plan.tier }
					readOnly
				/>
				<p className="gw-field-note">
					{ __( 'Tier determines tie-breaking order. Lower number = lower cost plan.', 'guidwell' ) }
				</p>
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
