import { useState, useRef, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import { getActivePlanFeatures } from '../utils/planFeatures';
import generatePlanInsight from '../utils/generatePlanInsight';

// ── Shared utilities ──────────────────────────────────────────────────────────

function CtaElement( { ctaUrl, ctaLabel, className } ) {
	if ( ! ctaLabel ) return null;
	if ( ctaUrl && ctaUrl !== '#' ) {
		return <a href={ ctaUrl } className={ className }>{ ctaLabel }</a>;
	}
	return <button type="button" className={ className }>{ ctaLabel }</button>;
}

// TODO: Feature list data comes from plan.features cross-referenced with
// guidwellData.features master list via getActivePlanFeatures(plan, featuresList).
// If no features configured, this block is hidden entirely.
// Future: pull from API if the features list is large.
function FeaturesList( { features, missing = false } ) {
	if ( ! features?.length ) return null;
	const listClass = `guidwell-features-list${ missing ? ' guidwell-features-list--missing' : '' }`;
	return (
		<ul className={ listClass }>
			{ features.map( ( f ) => (
				<li key={ f.id } className="guidwell-features-list__item">
					<span className="guidwell-features-list__icon" aria-hidden="true">
						{ missing ? '✕' : '✓' }
					</span>
					<span className="guidwell-features-list__label">{ f.label }</span>
				</li>
			) ) }
		</ul>
	);
}

// ── Email capture ─────────────────────────────────────────────────────────────

function EmailCapture( { apiBase, wizardId, nonce, topPlans, insight, textAnswers = [] } ) {
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
					textAnswers,
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
				<p className="guidwell-email-capture__success">{ __( '✓ Results sent — check your inbox.', 'guidwell' ) }</p>
			</div>
		);
	}

	return (
		<div className="guidwell-email-capture">
			<p className="guidwell-email-capture__label">{ __( 'Get a copy of your results', 'guidwell' ) }</p>
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
						: status === 'error' ? __( 'Failed — try again', 'guidwell' ) : __( 'Send', 'guidwell' )
					}
				</button>
			</div>
		</div>
	);
}

// ── Scoring report ────────────────────────────────────────────────────────────

function ScoringReport( { allScores, topPlans, config, answers } ) {
	const [ barsActive,   setBarsActive   ] = useState( false );
	const [ showAnswers,  setShowAnswers  ] = useState( false );

	useEffect( () => {
		const t = setTimeout( () => setBarsActive( true ), 120 );
		return () => clearTimeout( t );
	}, [] );

	const { questions = [] } = config || {};
	const recommendedSlug   = topPlans[ 0 ]?.slug;

	function barColor( plan ) {
		if ( plan.slug === recommendedSlug ) return 'var(--guidwell-primary)';
		if ( plan.slug === topPlans[ 1 ]?.slug ) return 'rgba(107, 114, 128, 0.7)';
		return 'rgba(107, 114, 128, 0.3)';
	}

	return (
		<div className="guidwell-report">
			<p className="guidwell-report__heading">{ __( 'How we scored this', 'guidwell' ) }</p>
			<div className="guidwell-report__panel-inner">

				{ /* Score bars — only plans that earned points */ }
				<p className="guidwell-report__section-label">{ __( 'Score breakdown', 'guidwell' ) }</p>
				{ allScores.filter( ( p ) => p.score > 0 ).map( ( plan, index ) => (
					<div key={ plan.slug } className="guidwell-report__score-row">
						<span className="guidwell-report__score-name">
							{ plan.name || plan.slug }
							{ plan.slug === recommendedSlug && <span className="guidwell-report__score-star"> ✦</span> }
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

				{ /* Answers — collapsed by default */ }
				<button
					type="button"
					className={ `guidwell-report__answers-toggle${ showAnswers ? ' guidwell-report__answers-toggle--open' : '' }` }
					onClick={ () => setShowAnswers( ( v ) => ! v ) }
					aria-expanded={ showAnswers }
				>
					{ __( 'Your answers', 'guidwell' ) }
					<span className="guidwell-report__answers-toggle-icon" aria-hidden="true">
						{ showAnswers ? '▾' : '▸' }
					</span>
				</button>
				{ showAnswers && (
					<div className="guidwell-report__answers">
						{ questions.map( ( question ) => {
							const selectedId = answers?.[ question.id ];
							if ( ! selectedId ) return null;

							if ( question.multiSelect && Array.isArray( selectedId ) ) {
								const selected = selectedId
									.map( ( id ) => question.answers?.find( ( a ) => a.id === id ) )
									.filter( Boolean );
								if ( ! selected.length ) return null;
								return (
									<div key={ question.id } className="guidwell-report__answer-row">
										<p className="guidwell-report__answer-question">{ question.text }</p>
										{ selected.map( ( a ) => (
											<p key={ a.id } className="guidwell-report__answer-selected">→ { a.label }</p>
										) ) }
									</div>
								);
							}

							const selectedAnswer = question.answers?.find( ( a ) => a.id === selectedId );
							if ( ! selectedAnswer ) return null;
							return (
								<div key={ question.id } className="guidwell-report__answer-row">
									<p className="guidwell-report__answer-question">{ question.text }</p>
									<p className="guidwell-report__answer-selected">→ { selectedAnswer.label }</p>
								</div>
							);
						} ) }
					</div>
				) }

			</div>
		</div>
	);
}

// ── Section 1: Hero ───────────────────────────────────────────────────────────

function HeroSection( { plan, insight, cardInsight, featuresList } ) {
	const { fitReason, whyItMatters } = cardInsight || {};
	const features = getActivePlanFeatures( plan, featuresList );

	return (
		<div className="guidwell-hero">

			{ /* Left column: recommended plan card */ }
			<div className="guidwell-hero-card">
				<span className="guidwell-hero-badge">
					✦ { __( 'Recommended for you', 'guidwell' ) }
				</span>
				{ plan.logoUrl && (
					<img
						src={ plan.logoUrl }
						alt={ plan.name || '' }
						className="guidwell-hero-logo"
					/>
				) }
				<p className="guidwell-hero-name">
					{ plan.name || __( 'Your Best Match', 'guidwell' ) }
				</p>
				{ plan.price && <p className="guidwell-hero-price">{ plan.price }</p> }
				<hr className="guidwell-hero-divider" />
				{ plan.description && (
					<p className="guidwell-hero-description">{ plan.description }</p>
				) }
			</div>

			{ /* Right column: justification + CTA */ }
			<div className="guidwell-hero-content">
				{ insight && (
					<p className="guidwell-hero-insight">{ insight }</p>
				) }
				{ fitReason && (
					<p className="guidwell-hero-fit-reason">{ fitReason }</p>
				) }
				{ whyItMatters && (
					<div className="guidwell-hero-why">
						<span className="guidwell-hero-section-label">
							{ __( 'Why this works for you', 'guidwell' ) }
						</span>
						<p className="guidwell-hero-why__text">{ whyItMatters }</p>
					</div>
				) }
				{ features.length > 0 && (
					<div className="guidwell-hero-features">
						<span className="guidwell-hero-section-label guidwell-hero-section-label--features">
							{ __( "What's included", 'guidwell' ) }
						</span>
						<FeaturesList features={ features } />
					</div>
				) }
				<CtaElement
					ctaUrl={ plan.ctaUrl }
					ctaLabel={ plan.ctaLabel }
					className="guidwell-hero-cta"
				/>
			</div>

		</div>
	);
}

// ── Section 2: Alternative plan card ─────────────────────────────────────────

function AltCard( { plan, cardInsight, recommendedPlan, featuresList, isPriority } ) {
	const { fitReason, upsellReason, isDowngrade } = cardInsight || {};

	const planFeatures  = getActivePlanFeatures( plan, featuresList );
	const recFeatures   = getActivePlanFeatures( recommendedPlan, featuresList );
	const planFeatureIds = new Set( planFeatures.map( ( f ) => f.id ) );
	const recFeatureIds  = new Set( recFeatures.map( ( f ) => f.id ) );

	// Features this plan adds over the recommended (shown on upgrade cards).
	const exclusiveFeatures = planFeatures.filter( ( f ) => ! recFeatureIds.has( f.id ) );
	// Features the recommended has that this plan lacks (shown on downgrade cards).
	const missingFeatures   = recFeatures.filter( ( f ) => ! planFeatureIds.has( f.id ) );

	const cardClass = `guidwell-alt-card ${ isPriority ? 'guidwell-alt-card--priority' : 'guidwell-alt-card--secondary' }`;

	return (
		<div className={ cardClass }>
			{ plan.logoUrl && (
				<img
					src={ plan.logoUrl }
					alt={ plan.name || '' }
					className="guidwell-alt-logo"
				/>
			) }
			{ plan.name  && <p className="guidwell-alt-name">{ plan.name }</p> }
			{ plan.price && <p className="guidwell-alt-price">{ plan.price }</p> }
			<hr className="guidwell-alt-divider" />
			{ fitReason && (
				<p className="guidwell-alt-fit-reason">{ fitReason }</p>
			) }

			{ isDowngrade ? (
				<>
					{ upsellReason && (
						<div className="guidwell-alt-upsell guidwell-alt-upsell--downgrade">
							<span className="guidwell-alt-upsell__label">
								{ __( "What you'd give up:", 'guidwell' ) }
							</span>
							<p className="guidwell-alt-upsell__text">{ upsellReason }</p>
						</div>
					) }
					{ missingFeatures.length > 0 && (
						<div className="guidwell-alt-features">
							<span className="guidwell-alt-features__label">
								{ __( 'Not included in this plan:', 'guidwell' ) }
							</span>
							<FeaturesList features={ missingFeatures } missing={ true } />
						</div>
					) }
				</>
			) : (
				<>
					{ upsellReason && (
						<div className="guidwell-alt-upsell">
							<span className="guidwell-alt-upsell__label">
								{ __( 'Why consider upgrading:', 'guidwell' ) }
							</span>
							<p className="guidwell-alt-upsell__text">{ upsellReason }</p>
						</div>
					) }
					{ exclusiveFeatures.length > 0 && (
						<div className="guidwell-alt-features">
							<span className="guidwell-alt-features__label">
								{ __( 'Also includes:', 'guidwell' ) }
							</span>
							<FeaturesList features={ exclusiveFeatures } />
						</div>
					) }
				</>
			) }

			{ plan.description && (
				<p className="guidwell-alt-description">{ plan.description }</p>
			) }
			<CtaElement
				ctaUrl={ plan.ctaUrl }
				ctaLabel={ plan.ctaLabel }
				className="guidwell-alt-cta"
			/>
		</div>
	);
}

// ── Section 2: Alternatives container ────────────────────────────────────────

function AlternativesSection( { topPlans, cardInsights, featuresList } ) {
	if ( topPlans.length <= 1 ) return null;

	const recommended = topPlans[ 0 ];
	const altPlans    = topPlans.slice( 1 );

	const sortedAlts = [ ...altPlans ].sort( ( a, b ) => {
		const aTierDiff = a.tier - recommended.tier;
		const bTierDiff = b.tier - recommended.tier;
		if ( aTierDiff > 0 && bTierDiff > 0 ) return b.tier - a.tier;
		if ( aTierDiff < 0 && bTierDiff < 0 ) return a.tier - b.tier;
		return bTierDiff - aTierDiff;
	} );

	return (
		<div className="guidwell-alternatives">
			<p className="guidwell-alternatives__label">
				{ __( 'Other options to consider', 'guidwell' ) }
			</p>
			<div className={ `guidwell-alternatives-grid${ sortedAlts.length === 1 ? ' guidwell-alternatives-grid--single' : '' }` }>
				{ sortedAlts.map( ( plan, i ) => {
					const originalIndex = topPlans.findIndex( ( p ) => p.slug === plan.slug );
					return (
						<AltCard
							key={ plan.slug }
							plan={ plan }
							cardInsight={ cardInsights[ originalIndex ] }
							recommendedPlan={ recommended }
							featuresList={ featuresList }
							isPriority={ i === 0 }
						/>
					);
				} ) }
			</div>
		</div>
	);
}

// ── Panel navigation hook ─────────────────────────────────────────────────────
//
// Manages a fixed-height container with N panels. Scrolling within a panel
// works naturally via overflow-y: auto. When the user reaches the top or bottom
// edge of a panel and keeps scrolling, we transition to the adjacent panel with
// a crossfade + slide animation. Touch swipe works the same way.
//
// Uses refs for all mutable scroll/lock state so that the wheel listener (added
// with capture:true, passive:false) never operates on a stale closure.

function usePanelNavigation( containerRef, panelCount ) {
	const [ activePanel,  setActivePanel  ] = useState( 0 );
	const [ exitingPanel, setExitingPanel ] = useState( null );
	const [ goingForward, setGoingForward ] = useState( true );

	// Mutable refs avoid stale-closure issues in the non-passive wheel handler.
	// downDelta/upDelta accumulate wheel intent before a panel advance fires.
	const stateRef  = useRef( { active: 0, lock: false, downDelta: 0, upDelta: 0 } );
	const panelRefs = useRef( [] );

	// Keep advanceRef pointing at a fresh closure every render so that
	// panelCount is always current inside the event handler.
	const advanceRef = useRef( null );
	advanceRef.current = function doAdvance( nextIndex, forward ) {
		const s = stateRef.current;
		if ( s.lock || nextIndex < 0 || nextIndex >= panelCount ) return;

		s.lock      = true;
		s.downDelta = 0;
		s.upDelta   = 0;
		setGoingForward( forward );
		setExitingPanel( s.active );
		s.active = nextIndex;
		setActivePanel( nextIndex );

		const nextEl = panelRefs.current[ nextIndex ];
		if ( nextEl ) nextEl.scrollTop = 0;

		setTimeout( () => {
			setExitingPanel( null );
			s.lock = false;
		}, 800 );
	};

	// Wheel — capture phase so we intercept before child scroll is applied.
	useEffect( () => {
		const container = containerRef.current;
		if ( ! container ) return;

		function onWheel( e ) {
			const s       = stateRef.current;
			const panelEl = panelRefs.current[ s.active ];
			if ( ! panelEl ) return;

			if ( s.lock ) { e.preventDefault(); return; }

			const scrollable = panelEl.scrollHeight > panelEl.clientHeight + 4;
			const atBottom   = ! scrollable ||
				panelEl.scrollTop + panelEl.clientHeight >= panelEl.scrollHeight - 16;
			const atTop      = ! scrollable || panelEl.scrollTop <= 16;

			if ( e.deltaY > 0 && atBottom ) {
				// Accumulate scroll intent; require 180px of total delta before advancing
				// so the user must scroll intentionally, not just graze the boundary.
				s.downDelta += e.deltaY;
				s.upDelta    = 0;
				e.preventDefault();
				if ( s.downDelta >= 180 ) {
					s.downDelta = 0;
					advanceRef.current( s.active + 1, true );
				}
			} else if ( e.deltaY < 0 && atTop ) {
				s.upDelta   += Math.abs( e.deltaY );
				s.downDelta  = 0;
				e.preventDefault();
				if ( s.upDelta >= 180 ) {
					s.upDelta = 0;
					advanceRef.current( s.active - 1, false );
				}
			} else {
				// Scrolling within the panel content — reset accumulators.
				s.downDelta = 0;
				s.upDelta   = 0;
			}
		}

		container.addEventListener( 'wheel', onWheel, { passive: false, capture: true } );
		return () => container.removeEventListener( 'wheel', onWheel, { capture: true } );
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	// Touch swipe
	useEffect( () => {
		const container = containerRef.current;
		if ( ! container ) return;

		let startY = 0;

		function onTouchStart( e ) { startY = e.touches[ 0 ].clientY; }

		function onTouchEnd( e ) {
			const s = stateRef.current;
			if ( s.lock ) return;

			const delta   = startY - e.changedTouches[ 0 ].clientY;
			const panelEl = panelRefs.current[ s.active ];
			if ( ! panelEl || Math.abs( delta ) < 50 ) return;

			const atBottom = panelEl.scrollTop + panelEl.clientHeight >= panelEl.scrollHeight - 6;
			const atTop    = panelEl.scrollTop <= 6;

			if ( delta > 0 && atBottom )   advanceRef.current( s.active + 1, true );
			else if ( delta < 0 && atTop ) advanceRef.current( s.active - 1, false );
		}

		container.addEventListener( 'touchstart', onTouchStart, { passive: true } );
		container.addEventListener( 'touchend',   onTouchEnd,   { passive: true } );
		return () => {
			container.removeEventListener( 'touchstart', onTouchStart );
			container.removeEventListener( 'touchend',   onTouchEnd );
		};
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	return {
		activePanel,
		exitingPanel,
		goingForward,
		panelRefs,
		doAdvance: ( i, fwd ) => advanceRef.current( i, fwd ),
	};
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ResultScreen( {
	topPlans     = [],
	allScores    = [],
	insight      = '',
	onRestart,
	config,
	answers      = {},
	featuresList = [],
	contact      = {},
	apiBase      = '',
	wizardId     = 0,
	nonce        = '',
	autoSentRef  = null,
	textAnswers  = [],
} ) {
	const containerRef = useRef( null );

	const cardInsights = topPlans.map( ( plan, i ) =>
		generatePlanInsight( plan, i + 1, answers, config )
	);

	// Auto-send result notification on mount (fire-and-forget).
	// Uses autoSentRef from Wizard so the guard survives the modal being closed and reopened
	// (the portal unmounts/remounts ResultScreen, which would reset a local useRef).
	useEffect( () => {
		if ( ! contact.sendOnResult || ! topPlans[ 0 ] ) return;
		if ( autoSentRef && autoSentRef.current ) return;
		if ( autoSentRef ) autoSentRef.current = true;
		fetch( `${ apiBase }send-result`, {
			method:  'POST',
			headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
			body:    JSON.stringify( {
				wizardId,
				recommendedPlan: topPlans[ 0 ] ?? null,
				runnerUpPlan:    topPlans[ 1 ] ?? null,
				insight,
				textAnswers,
			} ),
		} ).catch( () => {} );
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	// 0-plan fallback — plans not yet configured in the admin
	if ( ! topPlans.length ) {
		return (
			<div className="guidwell-result">
				<div className="guidwell-result__zero-state">
					<p className="guidwell-result__zero-heading">
						{ __( 'Thanks for completing the quiz!', 'guidwell' ) }
					</p>
					<p className="guidwell-result__zero-body">
						{ __( 'Recommendations are on their way — check back soon.', 'guidwell' ) }
					</p>
				</div>
				<div className="guidwell-result-footer">
					<button type="button" className="guidwell-result-restart" onClick={ onRestart }>
						{ __( 'Start over', 'guidwell' ) }
					</button>
				</div>
			</div>
		);
	}

	// Panel order: hero → alternatives (if any) → score/details
	const panelIds = [ 'hero' ];
	if ( topPlans.length > 1 ) panelIds.push( 'alternatives' );
	panelIds.push( 'details' );

	const { activePanel, exitingPanel, goingForward, panelRefs, doAdvance } =
		usePanelNavigation( containerRef, panelIds.length );

	function renderPanelContent( id ) {
		switch ( id ) {
			case 'hero':
				return (
					<HeroSection
						plan={ topPlans[ 0 ] }
						insight={ insight }
						cardInsight={ cardInsights[ 0 ] }
						featuresList={ featuresList }
					/>
				);
			case 'alternatives':
				return (
					<AlternativesSection
						topPlans={ topPlans }
						cardInsights={ cardInsights }
						featuresList={ featuresList }
					/>
				);
			case 'details':
				return (
					<>
						{ contact.collectVisitorEmail && (
							<EmailCapture
								apiBase={ apiBase }
								wizardId={ wizardId }
								nonce={ nonce }
								topPlans={ topPlans }
								insight={ insight }
								textAnswers={ textAnswers }
							/>
						) }
						<ScoringReport
							allScores={ allScores }
							topPlans={ topPlans }
							config={ config }
							answers={ answers }
						/>
					</>
				);
			default:
				return null;
		}
	}

	return (
		<div className="guidwell-result guidwell-result--panels" ref={ containerRef }>

			{ panelIds.map( ( id, i ) => {
				const isActive  = i === activePanel;
				const isExiting = i === exitingPanel;

				let cls = 'guidwell-panel';
				if ( isActive && exitingPanel !== null ) {
					cls += goingForward ? ' guidwell-panel--entering-fwd' : ' guidwell-panel--entering-back';
				} else if ( isActive ) {
					cls += ' guidwell-panel--active';
				} else if ( isExiting ) {
					cls += goingForward ? ' guidwell-panel--exiting-fwd' : ' guidwell-panel--exiting-back';
				}

				return (
					<div
						key={ id }
						className={ cls }
						ref={ ( el ) => { panelRefs.current[ i ] = el; } }
					>
						<div className="guidwell-panel__inner">
							{ renderPanelContent( id ) }
						</div>
					</div>
				);
			} ) }

			{ /* Bottom chrome: scroll hint (non-last panels) or restart (last panel) + dots */ }
			<div className="guidwell-panel-footer">
				{ activePanel < panelIds.length - 1 ? (
					<span className="guidwell-scroll-hint" aria-hidden="true">▾</span>
				) : (
					<button
						type="button"
						className="guidwell-result-restart"
						onClick={ onRestart }
					>
						{ __( 'Start over', 'guidwell' ) }
					</button>
				) }
				{ panelIds.length > 1 && (
					<div
						className="guidwell-panel-dots"
						role="tablist"
						aria-label={ __( 'Result panels', 'guidwell' ) }
					>
						{ panelIds.map( ( _, i ) => (
							<button
								key={ i }
								type="button"
								role="tab"
								aria-selected={ i === activePanel }
								className={ `guidwell-panel-dot${ i === activePanel ? ' guidwell-panel-dot--active' : '' }` }
								onClick={ () => doAdvance( i, i > activePanel ) }
							/>
						) ) }
					</div>
				) }
			</div>

		</div>
	);
}
