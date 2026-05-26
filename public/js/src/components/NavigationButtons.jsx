import { __ } from '@wordpress/i18n';

export default function NavigationButtons( {
	onNext,
	onBack,
	canGoBack,
	isLastStep,
	hasSelection,
} ) {
	return (
		<div className="guidwell-nav">
			{ canGoBack && (
				<button
					type="button"
					className="guidwell-btn guidwell-btn--back"
					onClick={ onBack }
					aria-label={ __( 'Go back to previous question', 'guidwell' ) }
				>
					{ __( 'Back', 'guidwell' ) }
				</button>
			) }
			<button
				type="button"
				className="guidwell-btn guidwell-btn--next"
				onClick={ onNext }
				disabled={ ! hasSelection }
				aria-label={ __( 'Go to next question', 'guidwell' ) }
			>
				{ isLastStep ? __( 'See My Results', 'guidwell' ) : __( 'Next', 'guidwell' ) }
			</button>
		</div>
	);
}
