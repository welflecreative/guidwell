import { __ } from '@wordpress/i18n';

export default function ProgressBar( { current, total } ) {
	const pct = Math.round( ( current / total ) * 100 );

	return (
		<div className="guidwell-progress">
			<div
				className="guidwell-progress-track"
				role="progressbar"
				aria-valuenow={ pct }
				aria-valuemin="0"
				aria-valuemax="100"
				aria-label={ __( 'Quiz progress', 'guidwell' ) }
			>
				<div
					className="guidwell-progress-fill"
					style={ { width: `${ pct }%` } }
				/>
			</div>
			<p className="guidwell-step-counter">
				{ /* translators: 1: current step number, 2: total steps */ }
				{ __( 'Step', 'guidwell' ) } { current } { __( 'of', 'guidwell' ) } { total }
			</p>
		</div>
	);
}
