import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { __ } from '@wordpress/i18n';
import QuestionStep from './QuestionStep';
import ProgressBar from './ProgressBar';
import ResultScreen from './ResultScreen';
import scoreAnswers, { getTopPlans, getAllScores } from '../utils/scoreAnswers';
import generateInsight from '../utils/generateInsight';
import detectThemeColors from '../utils/detectThemeColors';
import darkenHex from '../utils/darkenHex';

const HARDCODED_CONFIG = {
	questions: [
		{
			id: 1,
			text: __( 'What best describes your situation?', 'guidwell' ),
			answers: [
				{ id: '1a', label: __( 'Just getting started', 'guidwell' ),
					weights: { starter: 3, pro: 1, premium: 0 } },
				{ id: '1b', label: __( 'Established but ready to grow', 'guidwell' ),
					weights: { starter: 1, pro: 3, premium: 1 } },
				{ id: '1c', label: __( 'Scaling and need full support', 'guidwell' ),
					weights: { starter: 0, pro: 2, premium: 3 } },
			],
		},
		{
			id: 2,
			text: __( 'What is your primary goal right now?', 'guidwell' ),
			answers: [
				{ id: '2a', label: __( 'Build awareness and get visible', 'guidwell' ),
					weights: { starter: 3, pro: 2, premium: 0 } },
				{ id: '2b', label: __( 'Grow and engage my audience', 'guidwell' ),
					weights: { starter: 1, pro: 3, premium: 1 } },
				{ id: '2c', label: __( 'Generate leads and drive revenue', 'guidwell' ),
					weights: { starter: 0, pro: 2, premium: 3 } },
			],
		},
		{
			id: 3,
			text: __( 'How much support are you looking for?', 'guidwell' ),
			answers: [
				{ id: '3a', label: __( "Guidance — I'll handle execution", 'guidwell' ),
					weights: { starter: 3, pro: 1, premium: 0 } },
				{ id: '3b', label: __( 'Collaborative — we work together', 'guidwell' ),
					weights: { starter: 1, pro: 3, premium: 1 } },
				{ id: '3c', label: __( 'Fully managed — just handle it', 'guidwell' ),
					weights: { starter: 0, pro: 1, premium: 3 } },
			],
		},
		{
			id: 4,
			text: __( 'What is your approximate monthly budget?', 'guidwell' ),
			answers: [
				{ id: '4a', label: __( 'Under $500/month', 'guidwell' ),
					weights: { starter: 3, pro: 1, premium: 0 } },
				{ id: '4b', label: __( '$500 – $1,500/month', 'guidwell' ),
					weights: { starter: 1, pro: 3, premium: 1 } },
				{ id: '4c', label: __( '$1,500+/month', 'guidwell' ),
					weights: { starter: 0, pro: 1, premium: 3 } },
			],
		},
	],
	plans: [
		{
			slug: 'starter', tier: 1,
			name: __( 'Starter', 'guidwell' ), price: '$0/month',
			description: __( 'Edit this plan description to match your offer.', 'guidwell' ),
			ctaLabel: __( 'Get Started', 'guidwell' ), ctaUrl: '#',
		},
		{
			slug: 'pro', tier: 2,
			name: __( 'Pro', 'guidwell' ), price: '$0/month',
			description: __( 'Edit this plan description to match your offer.', 'guidwell' ),
			ctaLabel: __( 'Get Started', 'guidwell' ), ctaUrl: '#',
		},
		{
			slug: 'premium', tier: 3,
			name: __( 'Premium', 'guidwell' ), price: '$0/month',
			description: __( 'Edit this plan description to match your offer.', 'guidwell' ),
			ctaLabel: __( 'Contact Us', 'guidwell' ), ctaUrl: '#',
		},
	],
};

function SpinnerFallback() {
	return (
		<div className="guidwell-wrapper">
			<div className="guidwell-card guidwell-card--loading">
				<div className="guidwell-spinner" role="status" aria-label={ __( 'Loading…', 'guidwell' ) } />
			</div>
		</div>
	);
}

export default function Wizard() {
	const { wizardId = 0, apiBase = '', nonce = '', settings = {}, contact = {}, features: featuresList = [] } = window.guidwellData || {};

	const [ config,      setConfig      ] = useState( wizardId > 0 ? null : HARDCODED_CONFIG );
	const [ loading,     setLoading     ] = useState( wizardId > 0 );
	const [ fetchError,  setFetchError  ] = useState( false );
	const [ stepHistory, setStepHistory ] = useState( [] );
	const [ answers,     setAnswers     ] = useState( {} );
	const [ showResult,  setShowResult  ] = useState( false );
	const [ flipPhase,   setFlipPhase   ] = useState( 'idle' );

	const headingRef  = useRef( null );
	const portalRef   = useRef( null );
	const autoSentRef = useRef( false ); // persists across modal open/close; passed to ResultScreen

	// Apply settings as CSS custom properties.
	// Admin-set values are the base; theme detection overrides primary + bg if enabled and detected.
	useEffect( () => {
		const el = document.getElementById( 'guidwell' );
		if ( ! el ) return;

		let primary    = settings?.primaryColor   || null;
		let dark       = settings?.primaryDark    || null;
		let bg         = settings?.backgroundColor || null;
		const cardBg   = settings?.cardBackground  || null;

		if ( settings?.useThemeColors ) {
			const detected = detectThemeColors();
			if ( detected ) {
				if ( detected.primaryColor )    { primary = detected.primaryColor; dark = null; }
				if ( detected.backgroundColor ) { bg = detected.backgroundColor; }
			}
		}

		if ( primary ) {
			el.style.setProperty( '--guidwell-primary',      primary );
			el.style.setProperty( '--guidwell-primary-dark', dark || darkenHex( primary, 15 ) );
		}
		if ( bg )     el.style.setProperty( '--guidwell-bg',      bg );
		if ( cardBg ) el.style.setProperty( '--guidwell-card-bg', cardBg );

		const headingFont     = settings?.headingFont     || '';
		const bodyFont        = settings?.bodyFont        || '';
		const headingFontSize = settings?.headingFontSize || '';
		const bodyFontSize    = settings?.bodyFontSize    || '';

		if ( headingFont )     el.style.setProperty(   '--guidwell-heading-font', headingFont );
		else                   el.style.removeProperty( '--guidwell-heading-font' );
		if ( bodyFont )        el.style.setProperty(   '--guidwell-body-font',    bodyFont );
		else                   el.style.removeProperty( '--guidwell-body-font' );
		if ( headingFontSize ) el.style.setProperty(   '--guidwell-heading-size', `${ headingFontSize }px` );
		else                   el.style.removeProperty( '--guidwell-heading-size' );
		if ( bodyFontSize )    el.style.setProperty(   '--guidwell-body-size',    `${ bodyFontSize }px` );
		else                   el.style.removeProperty( '--guidwell-body-size' );
	}, [ settings ] );

	// Copy CSS vars from #guidwell to the portaled modal container before the browser paints,
	// so the modal inherits the correct brand colors even though it lives on document.body.
	useLayoutEffect( () => {
		if ( ! showResult || ! portalRef.current ) return;
		const src = document.getElementById( 'guidwell' );
		if ( ! src ) return;
		const computed = getComputedStyle( src );
		[
			'--guidwell-primary', '--guidwell-primary-dark',
			'--guidwell-bg', '--guidwell-card-bg',
			'--guidwell-border', '--guidwell-text', '--guidwell-muted',
			'--guidwell-selected-bg', '--guidwell-radius-card',
			'--guidwell-radius-btn', '--guidwell-shadow', '--guidwell-ease',
			'--guidwell-body-font', '--guidwell-heading-font',
			'--guidwell-body-size', '--guidwell-heading-size',
		].forEach( ( v ) => {
			const val = computed.getPropertyValue( v ).trim();
			if ( val ) portalRef.current.style.setProperty( v, val );
		} );
	}, [ showResult ] );

	// Fetch config from REST API, or fall back to hardcoded config.
	useEffect( () => {
		if ( wizardId <= 0 ) {
			setConfig( HARDCODED_CONFIG );
			setStepHistory( [ HARDCODED_CONFIG.questions[ 0 ]?.id ] );
			return;
		}

		fetch( `${ apiBase }config/${ wizardId }`, {
			headers: { 'X-WP-Nonce': window.guidwellData?.nonce || '' },
		} )
			.then( ( res ) => {
				if ( ! res.ok ) throw new Error( `HTTP ${ res.status }` );
				return res.json();
			} )
			.then( ( data ) => {
				setConfig( data );
				setStepHistory( [ data.questions[ 0 ]?.id ] );
				setLoading( false );
			} )
			.catch( () => {
				setFetchError( true );
				setLoading( false );
			} );
	}, [ wizardId, apiBase ] );

	// Move focus to heading after each step change — but not when the result modal is open.
	useEffect( () => {
		if ( flipPhase !== 'idle' || loading || showResult ) return;
		if ( headingRef.current ) headingRef.current.focus();
	}, [ stepHistory, showResult, flipPhase, loading ] );

	// Close result modal on Escape key.
	useEffect( () => {
		if ( ! showResult ) return;
		function onKey( e ) { if ( e.key === 'Escape' ) setShowResult( false ); }
		document.addEventListener( 'keydown', onKey );
		return () => document.removeEventListener( 'keydown', onKey );
	}, [ showResult ] );

	// Lock body scroll while result modal is open.
	useEffect( () => {
		if ( ! showResult ) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => { document.body.style.overflow = prev; };
	}, [ showResult ] );

	// ── Loading ──────────────────────────────────────────────────────────────

	if ( loading ) {
		return <SpinnerFallback />;
	}

	// ── Fetch error ──────────────────────────────────────────────────────────

	if ( fetchError ) {
		return (
			<div className="guidwell-wrapper">
				<div className="guidwell-card">
					<p className="guidwell-load-error">
						{ __( 'Something went wrong loading the wizard. Please refresh the page.', 'guidwell' ) }
					</p>
				</div>
			</div>
		);
	}

	// ── Wizard ───────────────────────────────────────────────────────────────

	const { questions, plans } = config;
	const isTreeMode     = config.mode === 'tree';
	const currentQId     = stepHistory[ stepHistory.length - 1 ];
	const question       = isTreeMode
		? questions.find( ( q ) => q.id === currentQId ) ?? questions[ 0 ]
		: questions[ stepHistory.length - 1 ] ?? questions[ 0 ];
	const selectedAnswer = answers[ question?.id ] ?? null;
	const totalSteps     = questions.length;

	// In tree mode: "last step" means neither the selected answer nor the question's default chain has a next target.
	// Multi-select and text questions always use defaultNext (no per-answer branching).
	const selectedAnswerObj = ( question?.multiSelect || question?.type === 'text' )
		? null
		: question?.answers?.find( ( a ) => a.id === selectedAnswer ) ?? null;
	const effectiveNext  = selectedAnswerObj?.next ?? question?.defaultNext ?? null;
	const hasAnswerForStep = question?.type === 'text' ||
		( question?.multiSelect
			? Array.isArray( selectedAnswer ) && selectedAnswer.length > 0
			: selectedAnswer !== null );
	const isLastStep = isTreeMode
		? hasAnswerForStep && effectiveNext === null
		: stepHistory.length === totalSteps;

	function transition( direction, callback ) {
		setFlipPhase( direction === 'forward' ? 'exit-forward' : 'exit-backward' );
		setTimeout( () => {
			callback();
			setFlipPhase( direction === 'forward' ? 'enter-forward' : 'enter-backward' );
			setTimeout( () => setFlipPhase( 'idle' ), 300 );
		}, 280 );
	}

	function handleAnswerSelect( answerId ) {
		setAnswers( ( prev ) => {
			const updated = { ...prev };
			if ( isTreeMode ) {
				const currentIdx = stepHistory.indexOf( currentQId );
				stepHistory.slice( currentIdx + 1 ).forEach( ( id ) => { delete updated[ id ]; } );
			} else {
				questions.slice( stepHistory.length ).forEach( ( q ) => { delete updated[ q.id ]; } );
			}

			if ( question.multiSelect ) {
				const current = Array.isArray( updated[ question.id ] ) ? updated[ question.id ] : [];
				const next    = current.includes( answerId )
					? current.filter( ( id ) => id !== answerId )
					: [ ...current, answerId ];
				return { ...updated, [ question.id ]: next.length ? next : null };
			}
			return { ...updated, [ question.id ]: answerId };
		} );
	}

	function handleNext() {
		if ( ! hasAnswerForStep || flipPhase !== 'idle' ) return;

		if ( isTreeMode ) {
			const nextId = selectedAnswerObj?.next ?? question?.defaultNext ?? null;
			if ( nextId === null ) {
				// Open result modal directly — no card-flip needed.
				setShowResult( true );
				return;
			}
			transition( 'forward', () => {
				// Prune any stale answers from branches the user navigated away from.
				const validIds = new Set( stepHistory.map( String ) );
				setAnswers( ( prev ) =>
					Object.fromEntries( Object.entries( prev ).filter( ( [ k ] ) => validIds.has( String( k ) ) ) )
				);
				setStepHistory( ( h ) => [ ...h, nextId ] );
			} );
		} else {
			if ( stepHistory.length < totalSteps ) {
				transition( 'forward', () =>
					setStepHistory( ( h ) => [ ...h, questions[ h.length ]?.id ] )
				);
			} else {
				setShowResult( true );
			}
		}
	}

	function handleBack() {
		if ( flipPhase !== 'idle' ) return;
		if ( stepHistory.length > 1 ) {
			transition( 'backward', () => setStepHistory( ( h ) => h.slice( 0, -1 ) ) );
		}
	}

	function handleCloseResult() {
		setShowResult( false );
	}

	function handleRestart() {
		setAnswers( {} );
		setShowResult( false );
		setStepHistory( [ questions[ 0 ]?.id ] );
	}

	const cardFlipClass = flipPhase === 'exit-forward'   ? ' guidwell-card--flip-exit'
		: flipPhase === 'exit-backward'  ? ' guidwell-card--flip-exit-back'
		: flipPhase === 'enter-forward'  ? ' guidwell-card--flip-enter'
		: flipPhase === 'enter-backward' ? ' guidwell-card--flip-enter-back'
		: '';

	// Compute result data only when modal is open.
	const topPlans    = showResult ? getTopPlans( answers, config, 3 ).filter( ( p, i ) => i === 0 || p.score > 0 ) : [];
	const allScores   = showResult ? getAllScores( answers, config ) : [];
	const insight     = showResult ? generateInsight( answers, config ) : '';
	const visitedIds  = new Set( stepHistory.map( String ) );
	const textAnswers = showResult
		? questions
			.filter( ( q ) => q.type === 'text' && answers[ q.id ] && visitedIds.has( String( q.id ) ) )
			.map( ( q ) => ( { question: q.text, answer: answers[ q.id ] } ) )
		: [];

	return (
		<>
			<div className="guidwell-wrapper">
				<div className="guidwell-wizard-frame">
					<div className={ `guidwell-card${ cardFlipClass }` }>
						<div className="guidwell-step">
							<QuestionStep
								question={ question }
								selectedAnswer={ selectedAnswer }
								onSelect={ handleAnswerSelect }
								onNext={ handleNext }
								onBack={ handleBack }
								canGoBack={ stepHistory.length > 1 }
								isLastStep={ isLastStep }
								headingRef={ headingRef }
							/>
						</div>
					</div>
					<ProgressBar
						current={ stepHistory.length }
						total={ totalSteps }
						treeMode={ isTreeMode }
					/>
				</div>
			</div>

			{ showResult && createPortal(
				<div className="guidwell-portal guidwell-scoped" ref={ portalRef }>
					<div
						className="guidwell-modal-overlay"
						onClick={ handleCloseResult }
					>
						<div
							className="guidwell-modal"
							onClick={ ( e ) => e.stopPropagation() }
							role="dialog"
							aria-modal="true"
							aria-label={ __( 'Your results', 'guidwell' ) }
						>
							<button
								type="button"
								className="guidwell-modal-close"
								onClick={ handleCloseResult }
								aria-label={ __( 'Close results', 'guidwell' ) }
							>
								&times;
							</button>
							<ResultScreen
								topPlans={ topPlans }
								allScores={ allScores }
								insight={ insight }
								onRestart={ handleRestart }
								config={ config }
								answers={ answers }
								featuresList={ featuresList }
								contact={ contact }
								apiBase={ apiBase }
								wizardId={ wizardId }
								nonce={ nonce }
								autoSentRef={ autoSentRef }
								textAnswers={ textAnswers }
							/>
						</div>
					</div>
				</div>,
				document.body
			) }
		</>
	);
}
