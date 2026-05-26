import { useEffect } from 'react';
import { __ } from '@wordpress/i18n';

function CheckIcon() {
	return (
		<div className="guidwell-result-check" aria-hidden="true">
			<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
				<circle cx="24" cy="24" r="24" fill="currentColor" opacity="0.12" />
				<circle cx="24" cy="24" r="18" fill="currentColor" opacity="0.18" />
				<path
					d="M14 24.5L20.5 31L34 17"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
}

export default function ResultScreen( { plan, contactEmail, onRestart, headingRef } ) {
	useEffect( () => {
		if ( headingRef?.current ) {
			headingRef.current.focus();
		}
	}, [] );

	if ( ! plan ) {
		const ctaHref = contactEmail ? `mailto:${ contactEmail }` : '#contact';

		return (
			<div className="guidwell-result">
				<CheckIcon />

				<h2
					className="guidwell-result-name"
					ref={ headingRef }
					tabIndex={ -1 }
				>
					{ __( "Let's find your fit", 'guidwell' ) }
				</h2>

				<p className="guidwell-result-description">
					{ __( "Based on your answers, let's talk. Reach out for a custom recommendation.", 'guidwell' ) }
				</p>

				<a href={ ctaHref } className="guidwell-result-cta">
					{ __( 'Get in Touch', 'guidwell' ) }
				</a>

				<button
					type="button"
					className="guidwell-result-restart"
					onClick={ onRestart }
				>
					{ __( 'Start over', 'guidwell' ) }
				</button>
			</div>
		);
	}

	return (
		<div className="guidwell-result">
			<CheckIcon />

			<p className="guidwell-result-eyebrow">
				{ __( 'Your recommended plan', 'guidwell' ) }
			</p>

			<h2
				className="guidwell-result-name"
				ref={ headingRef }
				tabIndex={ -1 }
			>
				{ plan.name }
			</h2>

			<p className="guidwell-result-price">{ plan.price }</p>

			<p className="guidwell-result-description">{ plan.description }</p>

			<a href={ plan.ctaUrl } className="guidwell-result-cta">
				{ plan.ctaLabel }
			</a>

			<button
				type="button"
				className="guidwell-result-restart"
				onClick={ onRestart }
			>
				{ __( 'Start over', 'guidwell' ) }
			</button>
		</div>
	);
}
