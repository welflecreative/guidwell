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
function FeaturesList( { features } ) {
	if ( ! features?.length ) return null;
	return (
		<ul className="guidwell-features-list">
			{ features.map( ( f ) => (
				<li key={ f.id } className="guidwell-features-list__item">
					<span className="guidwell-features-list__check" aria-hidden="true">✓</span>
					<span className="guidwell-features-list__label">{ f.label }</span>
				</li>
			) ) }
		</ul>
	);
}

// ── Email capture ─────────────────────────────────────────────────────────────

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

// ── Collapsible scoring report ────────────────────────────────────────────────

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

	const { questions = [] }  = config || {};
	const recommendedSlug     = topPlans[ 0 ]?.slug;

	function barColor( plan ) {
		if ( plan.slug === recommendedSlug ) return 'var(--guidwell-primary)';
		if ( plan.slug === topPlans[ 1 ]?.slug ) return 'rgba(107, 114, 128, 0.7)';
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
			<div id="guidwell-report-panel" className="guidwell-report__panel" ref={ panelRef } style={ { maxHeight: 0 } }>
				<div className="guidwell-report__panel-inner">
					<p className="guidwell-report__section-label">{ __( 'Your answers', 'guidwell' ) }</p>
					{ questions.map( ( question ) => {
						const selectedId     = answers?.[ question.id ];
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
					<p className="guidwell-report__section-label">{ __( 'Score breakdown', 'guidwell' ) }</p>
					{ allScores.map( ( plan, index ) => (
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
				</div>
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
				{ plan.name  && <p className="guidwell-hero-name">{ plan.name }</p> }
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
	const { fitReason, upsellReason } = cardInsight || {};

	const allFeatures       = getActivePlanFeatures( plan, featuresList );
	const topPlanFeatureIds = new Set( recommendedPlan?.features || [] );
	const exclusiveFeatures = allFeatures.filter( ( f ) => ! topPlanFeatureIds.has( f.id ) );
	const displayFeatures   = exclusiveFeatures.length > 0 ? exclusiveFeatures : allFeatures;
	const showExclusiveLabel = exclusiveFeatures.length > 0 && allFeatures.length > 0;

	const cardClass = `guidwell-alt-card ${ isPriority ? 'guidwell-alt-card--priority' : 'guidwell-alt-card--secondary' }`;

	return (
		<div className={ cardClass }>
			{ plan.name  && <p className="guidwell-alt-name">{ plan.name }</p> }
			{ plan.price && <p className="guidwell-alt-price">{ plan.price }</p> }
			<hr className="guidwell-alt-divider" />
			{ fitReason && (
				<p className="guidwell-alt-fit-reason">{ fitReason }</p>
			) }
			{ upsellReason && (
				<div className="guidwell-alt-upsell">
					<span className="guidwell-alt-upsell__label">
						{ __( 'Why consider upgrading:', 'guidwell' ) }
					</span>
					<p className="guidwell-alt-upsell__text">{ upsellReason }</p>
				</div>
			) }
			{ displayFeatures.length > 0 && (
				<div className="guidwell-alt-features">
					{ showExclusiveLabel && (
						<span className="guidwell-alt-features__label">
							{ __( 'Also includes:', 'guidwell' ) }
						</span>
					) }
					<FeaturesList features={ displayFeatures } />
				</div>
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
} ) {
	const hasFiredRef = useRef( false );

	const cardInsights = topPlans.map( ( plan, i ) =>
		generatePlanInsight( plan, i + 1, answers, config )
	);

	// Auto-send result notification on mount (fire-and-forget)
	useEffect( () => {
		if ( ! contact.sendOnResult || hasFiredRef.current || ! topPlans[ 0 ] ) return;
		hasFiredRef.current = true;
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
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	// 0-plan fallback
	if ( ! topPlans.length ) {
		return (
			<div className="guidwell-result">
				<p className="guidwell-result__zero-state">
					{ __( "Based on your answers, let's talk.", 'guidwell' ) }
				</p>
				<a href="#contact" className="guidwell-hero-cta guidwell-result__zero-cta">
					{ __( 'Get in Touch', 'guidwell' ) }
				</a>
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

			{ /* 1 — Hero: recommended plan card left, justification right */ }
			<HeroSection
				plan={ topPlans[ 0 ] }
				insight={ insight }
				cardInsight={ cardInsights[ 0 ] }
				featuresList={ featuresList }
			/>

			{ /* 2 — Alternatives */ }
			<AlternativesSection
				topPlans={ topPlans }
				cardInsights={ cardInsights }
				featuresList={ featuresList }
			/>

			{ /* 3 — Email capture */ }
			<div id="guidwell-email-capture">
				{ contact.collectVisitorEmail && (
					<EmailCapture
						apiBase={ apiBase }
						wizardId={ wizardId }
						nonce={ nonce }
						topPlans={ topPlans }
						insight={ insight }
					/>
				) }
			</div>

			{ /* 4 — Collapsible scoring report */ }
			<ScoringReport
				allScores={ allScores }
				topPlans={ topPlans }
				config={ config }
				answers={ answers }
			/>

			{ /* 5 — Footer */ }
			<div className="guidwell-result-footer">
				<button type="button" className="guidwell-result-restart" onClick={ onRestart }>
					{ __( 'Start over', 'guidwell' ) }
				</button>
			</div>

		</div>
	);
}
