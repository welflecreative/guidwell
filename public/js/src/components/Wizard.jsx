import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { __ } from '@wordpress/i18n';
import QuestionStep from './QuestionStep';
import ProgressBar from './ProgressBar';
import scoreAnswers, { getTopPlans, getAllScores } from '../utils/scoreAnswers';
import generateInsight from '../utils/generateInsight';
import detectThemeColors from '../utils/detectThemeColors';
import darkenHex from '../utils/darkenHex';

const ResultScreen = lazy( () => import( './ResultScreen' ) );

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
	const { wizardId = 0, apiBase = '', nonce = '', settings = {}, contact = {} } = window.guidwellData || {};

	const [ config,       setConfig       ] = useState( wizardId > 0 ? null : HARDCODED_CONFIG );
	const [ loading,      setLoading      ] = useState( wizardId > 0 );
	const [ fetchError,   setFetchError   ] = useState( false );
	const [ currentStep,  setCurrentStep  ] = useState( 0 );
	const [ answers,      setAnswers      ] = useState( {} );
	const [ showResult,   setShowResult   ] = useState( false );
	const [ transitioning,   setTransitioning  ] = useState( false );
	const [ transitionDir,   setTransitionDir  ] = useState( 'forward' );

	const headingRef = useRef( null );

	// Apply settings as CSS custom properties.
	useEffect( () => {
		const el = document.getElementById( 'guidwell' );
		if ( ! el ) return;

		if ( settings?.useThemeColors ) {
			const detected = detectThemeColors();
			if ( detected ) {
				if ( detected.primaryColor ) {
					el.style.setProperty( '--guidwell-primary',      detected.primaryColor );
					el.style.setProperty( '--guidwell-primary-dark', darkenHex( detected.primaryColor, 15 ) );
				}
				if ( detected.backgroundColor ) {
					el.style.setProperty( '--guidwell-bg', detected.backgroundColor );
				}
				return;
			}
		}

		if ( settings?.primaryColor ) {
			el.style.setProperty( '--guidwell-primary',      settings.primaryColor );
			el.style.setProperty( '--guidwell-primary-dark', settings.primaryDark || darkenHex( settings.primaryColor, 15 ) );
		}
		if ( settings?.backgroundColor ) el.style.setProperty( '--guidwell-bg',      settings.backgroundColor );
		if ( settings?.cardBackground )   el.style.setProperty( '--guidwell-card-bg', settings.cardBackground );
	}, [ settings ] );

	// Fetch config from REST API, or fall back to hardcoded config.
	useEffect( () => {
		if ( wizardId <= 0 ) {
			setConfig( HARDCODED_CONFIG );
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
				setLoading( false );
			} )
			.catch( () => {
				setFetchError( true );
				setLoading( false );
			} );
	}, [ wizardId, apiBase ] );

	// Move focus to heading after each step change.
	useEffect( () => {
		if ( ! transitioning && ! loading && headingRef.current ) {
			headingRef.current.focus();
		}
	}, [ currentStep, showResult, transitioning, loading ] );

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
	const question       = questions[ currentStep ];
	const selectedAnswer = answers[ question?.id ] ?? null;
	const totalSteps     = questions.length;

	function transition( direction, callback ) {
		setTransitionDir( direction );
		setTransitioning( true );
		setTimeout( () => {
			callback();
			setTransitioning( false );
		}, 300 );
	}

	function handleAnswerSelect( answerId ) {
		setAnswers( ( prev ) => {
			// Clear answers for all steps after the current one so stale
			// forward selections never influence the final score.
			const updated = { ...prev };
			questions.slice( currentStep + 1 ).forEach( ( q ) => {
				delete updated[ q.id ];
			} );
			return { ...updated, [ question.id ]: answerId };
		} );
	}

	function handleNext() {
		if ( ! selectedAnswer || transitioning ) return;
		if ( currentStep < totalSteps - 1 ) {
			transition( 'forward', () => setCurrentStep( ( s ) => s + 1 ) );
		} else {
			transition( 'forward', () => setShowResult( true ) );
		}
	}

	function handleBack() {
		if ( transitioning ) return;
		if ( showResult ) {
			transition( 'backward', () => setShowResult( false ) );
		} else if ( currentStep > 0 ) {
			transition( 'backward', () => setCurrentStep( ( s ) => s - 1 ) );
		}
	}

	function handleRestart() {
		setAnswers( {} );
		setShowResult( false );
		setCurrentStep( 0 );
	}

	const stepClass = transitioning
		? ( transitionDir === 'forward'
			? 'guidwell-step-exit guidwell-step-exit-active'
			: 'guidwell-step-enter guidwell-step-enter-active' )
		: 'guidwell-step-visible';

	if ( showResult ) {
		const topPlans  = getTopPlans( answers, config, 2 );
		const allScores = getAllScores( answers, config );
		const insight   = generateInsight( answers, config );
		return (
			<Suspense fallback={ <SpinnerFallback /> }>
				<div className="guidwell-wrapper">
					<div className="guidwell-card">
						<ResultScreen
							topPlans={ topPlans }
							allScores={ allScores }
							insight={ insight }
							onRestart={ handleRestart }
							headingRef={ headingRef }
							config={ config }
							answers={ answers }
							contact={ contact }
							apiBase={ apiBase }
							wizardId={ wizardId }
							nonce={ nonce }
						/>
					</div>
				</div>
			</Suspense>
		);
	}

	return (
		<div className="guidwell-wrapper">
			<div className="guidwell-card">
				<ProgressBar current={ currentStep + 1 } total={ totalSteps } />
				<div className={ `guidwell-step ${ stepClass }` }>
					<QuestionStep
						question={ question }
						selectedAnswer={ selectedAnswer }
						onSelect={ handleAnswerSelect }
						onNext={ handleNext }
						onBack={ handleBack }
						canGoBack={ currentStep > 0 }
						isLastStep={ currentStep === totalSteps - 1 }
						headingRef={ headingRef }
					/>
				</div>
			</div>
		</div>
	);
}
