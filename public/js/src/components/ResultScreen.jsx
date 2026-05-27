import { useState, useRef, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import generatePlanInsight from '../utils/generatePlanInsight';

// ── Shared sub-components ─────────────────────────────────────────────────────

function InsightBanner( { insight } ) {
	if ( ! insight ) return null;
	return (
		<div className="guidwell-insight" role="note">
			<span className="guidwell-insight__icon" aria-hidden="true">
				<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
					<circle cx="14" cy="14" r="14" fill="currentColor" opacity="0.15" />
					<path d="M8 14.5l4.5 4.5 7.5-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</span>
			<p className="guidwell-insight__text">{ insight }</p>
		</div>
	);
}

function CtaElement( { ctaUrl, ctaLabel, className } ) {
	if ( ! ctaLabel ) return null;
	if ( ctaUrl && ctaUrl !== '#' ) {
		return <a href={ ctaUrl } className={ className }>{ ctaLabel }</a>;
	}
	return <button type="button" className={ className }>{ ctaLabel }</button>;
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

// ── Podium card inner content ─────────────────────────────────────────────────

function PodiumCardContent( { plan, cardInsight, isFirst } ) {
	const { fitReason, upsellReason, whyItMatters } = cardInsight || {};
	const ctaClass = `guidwell-podium-card__cta ${ isFirst ? 'guidwell-podium-card__cta--filled' : 'guidwell-podium-card__cta--ghost' }`;

	return (
		<div className="guidwell-podium-card">
			{ plan.name  && <p className="guidwell-podium-card__name">{ plan.name }</p> }
			{ plan.price && <p className="guidwell-podium-card__price">{ plan.price }</p> }
			<hr className="guidwell-podium-card__divider" />
			{ isFirst ? (
				<>
					{ fitReason    && <p className="guidwell-podium-card__fit-reason">{ fitReason }</p> }
					{ whyItMatters && <p className="guidwell-podium-card__why">{ whyItMatters }</p> }
					{ plan.description && <p className="guidwell-podium-card__description">{ plan.description }</p> }
				</>
			) : (
				<>
					{ plan.description && (
						<p className="guidwell-podium-card__description guidwell-podium-card__description--clamped">
							{ plan.description }
						</p>
					) }
					{ upsellReason && (
						<div className="guidwell-upsell-banner">
							<span className="guidwell-upsell-banner__label">{ __( 'Why consider upgrading:', 'guidwell' ) }</span>
							<p className="guidwell-upsell-banner__text">{ upsellReason }</p>
						</div>
					) }
				</>
			) }
			<div className="guidwell-podium-card__cta-wrap">
				<CtaElement ctaUrl={ plan.ctaUrl } ctaLabel={ plan.ctaLabel } className={ ctaClass } />
			</div>
		</div>
	);
}

// ── Desktop podium ────────────────────────────────────────────────────────────

function PodiumDisplay( { topPlans, cardInsights, hoveredSlot, setHoveredSlot } ) {
	// DOM order: p2 (left), p1 (center), p3 (right)
	const slots = topPlans.length >= 3
		? [
			{ plan: topPlans[ 1 ], insight: cardInsights[ 1 ], position: 2, planIndex: 1 },
			{ plan: topPlans[ 0 ], insight: cardInsights[ 0 ], position: 1, planIndex: 0 },
			{ plan: topPlans[ 2 ], insight: cardInsights[ 2 ], position: 3, planIndex: 2 },
		  ]
		: [
			{ plan: topPlans[ 1 ], insight: cardInsights[ 1 ], position: 2, planIndex: 1 },
			{ plan: topPlans[ 0 ], insight: cardInsights[ 0 ], position: 1, planIndex: 0 },
		  ];

	const badgeLabels = {
		1: __( '✦ Best Match', 'guidwell' ),
		2: __( '2nd', 'guidwell' ),
		3: __( '3rd', 'guidwell' ),
	};

	const ariaLabels = {
		1: ( name ) => `${ __( 'Recommended plan:', 'guidwell' ) } ${ name }`,
		2: ( name ) => `${ __( 'Second option:', 'guidwell' ) } ${ name }`,
		3: ( name ) => `${ __( 'Third option:', 'guidwell' ) } ${ name }`,
	};

	return (
		<div className="guidwell-podium" onMouseLeave={ () => setHoveredSlot( null ) }>
			{ slots.map( ( { plan, insight, position, planIndex } ) => {
				const isHovered = hoveredSlot === planIndex;
				const isDimmed  = hoveredSlot !== null && ! isHovered;

				const slotClass = [
					'guidwell-podium-slot',
					`guidwell-podium-slot--p${ position }`,
					isHovered ? 'guidwell-podium-slot--hovered' : '',
					isDimmed  ? 'guidwell-podium-slot--dimmed'  : '',
				].filter( Boolean ).join( ' ' );

				return (
					<div
						key={ plan.slug }
						className={ slotClass }
						onMouseEnter={ () => setHoveredSlot( planIndex ) }
						onMouseLeave={ () => setHoveredSlot( null ) }
						onFocus={ () => setHoveredSlot( planIndex ) }
						onBlur={ () => setHoveredSlot( null ) }
						tabIndex="0"
						aria-label={ ariaLabels[ position ]( plan.name ) }
					>
						<span className={ `guidwell-podium-badge guidwell-podium-badge--p${ position }` }>
							{ badgeLabels[ position ] }
						</span>
						<PodiumCardContent
							plan={ plan }
							cardInsight={ insight }
							isFirst={ position === 1 }
						/>
					</div>
				);
			} ) }
		</div>
	);
}

// ── Mobile carousel ───────────────────────────────────────────────────────────

function Carousel( { topPlans, cardInsights } ) {
	const [ activeIndex, setActiveIndex ] = useState( 0 );
	const [ touchStartX, setTouchStartX ] = useState( null );
	const [ touchDeltaX, setTouchDeltaX ] = useState( 0 );
	const [ isDragging,  setIsDragging  ] = useState( false );
	const [ cardW,       setCardW       ] = useState( 260 );
	const containerRef = useRef( null );

	const GAP = 16;

	useEffect( () => {
		const measure = () => {
			if ( ! containerRef.current ) return;
			const w = containerRef.current.offsetWidth;
			setCardW( Math.min( Math.round( w * 0.8 ), 300 ) );
		};
		measure();
		const ro = new ResizeObserver( measure );
		if ( containerRef.current ) ro.observe( containerRef.current );
		return () => ro.disconnect();
	}, [] );

	const containerW   = containerRef.current?.offsetWidth ?? 0;
	const baseOffset   = containerW / 2 - activeIndex * ( cardW + GAP ) - cardW / 2;
	const trackOffset  = isDragging ? baseOffset + touchDeltaX : baseOffset;

	function handleTouchStart( e ) {
		setTouchStartX( e.touches[ 0 ].clientX );
		setIsDragging( true );
	}

	function handleTouchMove( e ) {
		if ( touchStartX === null ) return;
		setTouchDeltaX( e.touches[ 0 ].clientX - touchStartX );
	}

	function handleTouchEnd() {
		if ( touchDeltaX < -50 && activeIndex < topPlans.length - 1 ) setActiveIndex( ( i ) => i + 1 );
		else if ( touchDeltaX > 50 && activeIndex > 0 ) setActiveIndex( ( i ) => i - 1 );
		setIsDragging( false );
		setTouchStartX( null );
		setTouchDeltaX( 0 );
	}

	function handleKeyDown( e ) {
		if ( e.key === 'ArrowRight' ) setActiveIndex( ( i ) => Math.min( i + 1, topPlans.length - 1 ) );
		if ( e.key === 'ArrowLeft'  ) setActiveIndex( ( i ) => Math.max( i - 1, 0 ) );
	}

	return (
		<div
			ref={ containerRef }
			className="guidwell-carousel"
			role="region"
			aria-label={ __( 'Plan options', 'guidwell' ) }
			aria-roledescription="carousel"
			onKeyDown={ handleKeyDown }
			tabIndex="0"
		>
			<div
				className={ `guidwell-carousel-track${ isDragging ? ' guidwell-carousel-track--dragging' : '' }` }
				style={ { transform: `translateX(${ trackOffset }px)` } }
				onTouchStart={ handleTouchStart }
				onTouchMove={ handleTouchMove }
				onTouchEnd={ handleTouchEnd }
			>
				{ topPlans.map( ( plan, i ) => {
					const isActive = i === activeIndex;
					const { fitReason, upsellReason, whyItMatters } = cardInsights[ i ] || {};
					const ctaClass = 'guidwell-podium-card__cta guidwell-podium-card__cta--filled';

					return (
						<div
							key={ plan.slug }
							className={ `guidwell-carousel-card${ isActive ? ' guidwell-carousel-card--active' : '' }` }
							style={ { width: cardW } }
							onClick={ ! isActive ? () => setActiveIndex( i ) : undefined }
							aria-hidden={ ! isActive }
						>
							{ i === 0 && (
								<span className="guidwell-podium-badge guidwell-podium-badge--p1">
									{ __( '✦ Best Match', 'guidwell' ) }
								</span>
							) }
							<div className="guidwell-podium-card">
								{ plan.name  && <p className="guidwell-podium-card__name">{ plan.name }</p> }
								{ plan.price && <p className="guidwell-podium-card__price">{ plan.price }</p> }
								<hr className="guidwell-podium-card__divider" />
								{ isActive && fitReason    && <p className="guidwell-carousel-card__fit-reason">{ fitReason }</p> }
								{ isActive && whyItMatters && <p className="guidwell-carousel-card__why">{ whyItMatters }</p> }
								{ plan.description && <p className="guidwell-podium-card__description">{ plan.description }</p> }
								{ isActive && upsellReason && (
									<div className="guidwell-carousel-upsell">
										<span className="guidwell-upsell-banner__label">{ __( 'Why consider upgrading:', 'guidwell' ) }</span>
										<p className="guidwell-upsell-banner__text">{ upsellReason }</p>
									</div>
								) }
								{ isActive && plan.ctaLabel && (
									<div className="guidwell-podium-card__cta-wrap">
										<CtaElement ctaUrl={ plan.ctaUrl } ctaLabel={ plan.ctaLabel } className={ ctaClass } />
									</div>
								) }
							</div>
						</div>
					);
				} ) }
			</div>
			<p className="guidwell-carousel-indicator">
				{ activeIndex + 1 } { __( 'of', 'guidwell' ) } { topPlans.length }
			</p>
		</div>
	);
}

// ── Single-plan fallback ──────────────────────────────────────────────────────

function SingleCard( { plan, cardInsight } ) {
	const { fitReason, whyItMatters } = cardInsight || {};
	return (
		<div className="guidwell-single-card">
			<span className="guidwell-podium-badge guidwell-podium-badge--p1">{ __( '✦ Best Match', 'guidwell' ) }</span>
			{ plan.name        && <p className="guidwell-single-card__name">{ plan.name }</p> }
			{ plan.price       && <p className="guidwell-single-card__price">{ plan.price }</p> }
			<hr className="guidwell-single-card__divider" />
			{ fitReason        && <p className="guidwell-single-card__fit-reason">{ fitReason }</p> }
			{ whyItMatters     && <p className="guidwell-single-card__why">{ whyItMatters }</p> }
			{ plan.description && <p className="guidwell-single-card__description">{ plan.description }</p> }
			<CtaElement ctaUrl={ plan.ctaUrl } ctaLabel={ plan.ctaLabel } className="guidwell-single-card__cta" />
		</div>
	);
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ResultScreen( {
	topPlans  = [],
	allScores = [],
	insight   = '',
	onRestart,
	config,
	answers   = {},
	contact   = {},
	apiBase   = '',
	wizardId  = 0,
	nonce     = '',
} ) {
	const [ hoveredSlot, setHoveredSlot ] = useState( null );
	const hasFiredRef = useRef( false );

	// Generate per-card insight copy
	const cardInsights = topPlans.map( ( plan, i ) =>
		generatePlanInsight( plan, i + 1, answers, config )
	);

	// Auto-send result notification on mount
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

	if ( ! topPlans.length ) {
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

			{ topPlans.length === 1 ? (
				<SingleCard plan={ topPlans[ 0 ] } cardInsight={ cardInsights[ 0 ] } />
			) : (
				<>
					<PodiumDisplay
						topPlans={ topPlans }
						cardInsights={ cardInsights }
						hoveredSlot={ hoveredSlot }
						setHoveredSlot={ setHoveredSlot }
					/>
					<Carousel topPlans={ topPlans } cardInsights={ cardInsights } />
				</>
			) }

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
