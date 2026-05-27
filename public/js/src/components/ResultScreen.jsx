import { useState, useRef, useEffect, useCallback } from 'react';
import { __ } from '@wordpress/i18n';

function InsightBanner( { insight } ) {
	if ( ! insight ) return null;
	return (
		<div className="guidwell-insight" role="note">
			<span className="guidwell-insight__icon" aria-hidden="true">
				<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
					<circle cx="14" cy="14" r="14" fill="currentColor" opacity="0.15" />
					<path
						d="M8 14.5l4.5 4.5 7.5-9"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</span>
			<p className="guidwell-insight__text">{ insight }</p>
		</div>
	);
}

function PlanCard( { plan, isRecommended, headingRef } ) {
	const variant    = isRecommended ? 'recommended' : 'runner-up';
	const badgeLabel = isRecommended
		? __( '✦ Recommended for you', 'guidwell' )
		: __( 'Also worth considering', 'guidwell' );

	return (
		<div className={ `guidwell-comparison__col guidwell-comparison__col--${ variant }` }>
			<span className={ `guidwell-plan-badge guidwell-plan-badge--${ variant }` }>
				{ badgeLabel }
			</span>
			<div className={ `guidwell-plan-card guidwell-plan-card--${ variant }` }>
				<p
					className={ `guidwell-plan-card__name guidwell-plan-card__name--${ variant }` }
					ref={ isRecommended ? headingRef : null }
					tabIndex={ isRecommended ? -1 : undefined }
				>
					{ plan.name }
				</p>

				{ plan.price && (
					<p className={ `guidwell-plan-card__price guidwell-plan-card__price--${ variant }` }>
						{ plan.price }
					</p>
				) }

				<hr className="guidwell-plan-card__divider" />

				{ plan.description && (
					<p className={ `guidwell-plan-card__description guidwell-plan-card__description--${ variant }` }>
						{ plan.description }
					</p>
				) }

				{ plan.ctaLabel && (
					<a
						href={ plan.ctaUrl || '#' }
						className={ `guidwell-plan-card__cta guidwell-plan-card__cta--${ isRecommended ? 'filled' : 'ghost' }` }
					>
						{ plan.ctaLabel }
					</a>
				) }
			</div>
		</div>
	);
}

function ScoringReport( { allScores, topPlans, config, answers } ) {
	const [ isOpen,     setIsOpen     ] = useState( false );
	const [ barsActive, setBarsActive ] = useState( false );
	const panelRef = useRef( null );

	useEffect( () => {
		if ( ! panelRef.current ) return;
		if ( isOpen ) {
			panelRef.current.style.maxHeight = panelRef.current.scrollHeight + 'px';
			const t = setTimeout( () => setBarsActive( true ), 50 );
			return () => clearTimeout( t );
		} else {
			panelRef.current.style.maxHeight = '0';
			setBarsActive( false );
		}
	}, [ isOpen ] );

	const { questions = [] } = config || {};
	const recommendedSlug   = topPlans[ 0 ]?.slug;
	const runnerUpSlug      = topPlans[ 1 ]?.slug;

	function barColor( plan ) {
		if ( plan.slug === recommendedSlug ) return 'var(--guidwell-primary)';
		if ( plan.slug === runnerUpSlug )    return 'rgba(107, 114, 128, 0.7)';
		return 'rgba(107, 114, 128, 0.3)';
	}

	return (
		<div className="guidwell-report">
			<button
				type="button"
				className={ `guidwell-report__toggle${ isOpen ? ' guidwell-report__toggle--open' : '' }` }
				onClick={ () => setIsOpen( ( o ) => ! o ) }
				aria-expanded={ isOpen }
				aria-controls="guidwell-report-panel"
			>
				{ isOpen ? '▼' : '▶' } { __( 'How we scored this', 'guidwell' ) }
			</button>

			<div
				id="guidwell-report-panel"
				className="guidwell-report__panel"
				ref={ panelRef }
				style={ { maxHeight: 0 } }
			>
				<div className="guidwell-report__panel-inner">

					<p className="guidwell-report__section-label">
						{ __( 'Your answers', 'guidwell' ) }
					</p>

					{ questions.map( ( question ) => {
						const selectedId    = answers?.[ question.id ];
						const selectedAnswer = question.answers?.find( ( a ) => a.id === selectedId );
						if ( ! selectedAnswer ) return null;
						return (
							<div key={ question.id } className="guidwell-report__answer-row">
								<p className="guidwell-report__answer-question">{ question.text }</p>
								<p className="guidwell-report__answer-selected">→ { selectedAnswer.label }</p>
							</div>
						);
					} ) }

					<hr className="guidwell-report__divider" />

					<p className="guidwell-report__section-label">
						{ __( 'Score breakdown', 'guidwell' ) }
					</p>

					{ allScores.map( ( plan, index ) => (
						<div key={ plan.slug } className="guidwell-report__score-row">
							<span className="guidwell-report__score-name">
								{ plan.name || plan.slug }
								{ plan.slug === recommendedSlug && (
									<span className="guidwell-report__score-star"> ✦</span>
								) }
							</span>
							<div className="guidwell-report__score-bar-wrap">
								<div className="guidwell-report__score-bar-track">
									<div
										className="guidwell-report__score-bar-fill"
										style={ {
											width:           barsActive ? `${ plan.percentageOfMax }%` : '0%',
											backgroundColor: barColor( plan ),
											transitionDelay: `${ index * 80 }ms`,
										} }
									/>
								</div>
								<span className="guidwell-report__score-number">{ plan.score }</span>
							</div>
						</div>
					) ) }

				</div>
			</div>
		</div>
	);
}

function EmailCapture( { apiBase, wizardId, nonce, topPlans, insight } ) {
	const [ email,  setEmail  ] = useState( '' );
	const [ status, setStatus ] = useState( 'idle' );

	async function handleSend() {
		if ( ! email || status !== 'idle' ) return;
		setStatus( 'sending' );
		try {
			const res = await fetch( `${ apiBase }send-result`, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
				body:    JSON.stringify( {
					wizardId,
					recommendedPlan: topPlans[ 0 ] ?? null,
					runnerUpPlan:    topPlans[ 1 ] ?? null,
					insight,
					visitorEmail:    email,
				} ),
			} );
			if ( ! res.ok ) throw new Error();
			setStatus( 'sent' );
		} catch {
			setStatus( 'error' );
			setTimeout( () => setStatus( 'idle' ), 3000 );
		}
	}

	if ( status === 'sent' ) {
		return (
			<div className="guidwell-email-capture guidwell-email-capture--sent">
				<p className="guidwell-email-capture__success">
					{ __( '✓ Results sent — check your inbox.', 'guidwell' ) }
				</p>
			</div>
		);
	}

	return (
		<div className="guidwell-email-capture">
			<p className="guidwell-email-capture__label">
				{ __( 'Get a copy of your results', 'guidwell' ) }
			</p>
			<div className="guidwell-email-capture__row">
				<input
					type="email"
					className="guidwell-email-capture__input"
					placeholder={ __( 'Your email address', 'guidwell' ) }
					value={ email }
					onChange={ ( e ) => setEmail( e.target.value ) }
					onKeyDown={ ( e ) => e.key === 'Enter' && handleSend() }
					disabled={ status === 'sending' }
				/>
				<button
					type="button"
					className={ `guidwell-email-capture__btn${ status === 'error' ? ' guidwell-email-capture__btn--error' : '' }` }
					onClick={ handleSend }
					disabled={ ! email || status === 'sending' }
				>
					{ status === 'sending'
						? <span className="guidwell-spinner guidwell-spinner--sm" role="status" aria-label={ __( 'Sending…', 'guidwell' ) } />
						: status === 'error'
							? __( 'Failed — try again', 'guidwell' )
							: __( 'Send', 'guidwell' )
					}
				</button>
			</div>
		</div>
	);
}

export default function ResultScreen( {
	topPlans    = [],
	allScores   = [],
	insight     = '',
	onRestart,
	config,
	answers,
	headingRef,
	contact     = {},
	apiBase     = '',
	wizardId    = 0,
	nonce       = '',
} ) {
	const recommended = topPlans[ 0 ] ?? null;
	const runnerUp    = topPlans[ 1 ] ?? null;
	const hasFired    = useRef( false );

	useEffect( () => {
		if ( headingRef?.current ) headingRef.current.focus();
	}, [] );

	useEffect( () => {
		if ( ! contact.sendOnResult || hasFired.current || ! recommended ) return;
		hasFired.current = true;
		fetch( `${ apiBase }send-result`, {
			method:  'POST',
			headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
			body:    JSON.stringify( {
				wizardId,
				recommendedPlan: topPlans[ 0 ] ?? null,
				runnerUpPlan:    topPlans[ 1 ] ?? null,
				insight,
			} ),
		} ).catch( () => {} );
	}, [] );

	if ( ! recommended ) {
		return (
			<div className="guidwell-result">
				<p style={ { color: 'var(--guidwell-muted)', textAlign: 'center' } }>
					{ __( 'Something went wrong calculating your results.', 'guidwell' ) }
				</p>
				<div className="guidwell-result-footer">
					<button type="button" className="guidwell-result-restart" onClick={ onRestart }>
						{ __( 'Start over', 'guidwell' ) }
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="guidwell-result">
			<InsightBanner insight={ insight } />

			<div className={ `guidwell-comparison${ ! runnerUp ? ' guidwell-comparison--single' : '' }` }>
				<PlanCard plan={ recommended } isRecommended={ true } headingRef={ headingRef } />
				{ runnerUp && <PlanCard plan={ runnerUp } isRecommended={ false } /> }
			</div>

			{ contact.collectVisitorEmail && (
				<EmailCapture
					apiBase={ apiBase }
					wizardId={ wizardId }
					nonce={ nonce }
					topPlans={ topPlans }
					insight={ insight }
				/>
			) }

			<ScoringReport
				allScores={ allScores }
				topPlans={ topPlans }
				config={ config }
				answers={ answers }
			/>

			<div className="guidwell-result-footer">
				<button type="button" className="guidwell-result-restart" onClick={ onRestart }>
					{ __( 'Start over', 'guidwell' ) }
				</button>
			</div>
		</div>
	);
}
