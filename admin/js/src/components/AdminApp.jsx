import { useState, useEffect, useRef, useCallback } from 'react';
import { __ } from '@wordpress/i18n';
import QuestionEditor from './QuestionEditor';
import PlanEditor from './PlanEditor';
import SettingsTab from './SettingsTab';
import NotificationsTab from './NotificationsTab';
import FeaturesTab from './FeaturesTab';
import LogicTab from './LogicTab';
import Sortable from 'sortablejs';

const {
	apiBase,
	nonce,
	wizardId:  INITIAL_WIZARD_ID,
	settings:  INITIAL_SETTINGS,
	tier:      TIER_DATA = {},
} = window.guidwellAdminData || {};

// null = unlimited
const QUESTION_LIMIT = TIER_DATA?.limits?.questions_per_wizard ?? null;
const UPGRADE_URL    = TIER_DATA?.upgrade_url || 'https://welflecreative.com/guidwell';

const STARTER_CONFIG = {
	questions: [
		{
			id: 1,
			text: __( 'What best describes your situation?', 'guidwell' ),
			answers: [
				{ id: '1a', label: __( 'Just getting started', 'guidwell' ),       weights: { starter: 3, pro: 1, premium: 0 } },
				{ id: '1b', label: __( 'Established but ready to grow', 'guidwell' ), weights: { starter: 1, pro: 3, premium: 1 } },
				{ id: '1c', label: __( 'Scaling and need full support', 'guidwell' ), weights: { starter: 0, pro: 2, premium: 3 } },
			],
		},
	],
	plans: [
		{ slug: 'starter', tier: 1, name: __( 'Starter',  'guidwell' ), price: '', description: '', ctaLabel: __( 'Get Started', 'guidwell' ), ctaUrl: '#' },
		{ slug: 'pro',     tier: 2, name: __( 'Pro',      'guidwell' ), price: '', description: '', ctaLabel: __( 'Get Started', 'guidwell' ), ctaUrl: '#' },
		{ slug: 'premium', tier: 3, name: __( 'Premium',  'guidwell' ), price: '', description: '', ctaLabel: __( 'Contact Us',  'guidwell' ), ctaUrl: '#' },
	],
};

export default function AdminApp() {
	const [ wizardId,     setWizardId     ] = useState( INITIAL_WIZARD_ID || 0 );
	const [ config,       setConfig       ] = useState( null );
	const [ features,     setFeatures     ] = useState( [] );
	const [ activeTab,    setActiveTab    ] = useState( 'builder' );
	const [ selectedId,   setSelectedId   ] = useState( null );
	const [ savingStatus, setSavingStatus ] = useState( 'idle' );
	const [ notification, setNotification ] = useState( null );
	const [ isFirstRun,   setIsFirstRun   ] = useState( false );
	const [ isDirty,      setIsDirty      ] = useState( false );

	// Single ref shared by settings + notifications tabs — whichever is mounted
	// registers its save function here; AdminApp calls it from the global button.
	const tabSaveRef = useRef( null );

	const questionsListRef  = useRef( null );
	const configRef         = useRef( config );
	const initialLoadDone   = useRef( false );
	useEffect( () => { configRef.current = config; }, [ config ] );

	// Mark dirty whenever config changes after the initial server load.
	useEffect( () => {
		if ( ! config ) return;
		if ( ! initialLoadDone.current ) { initialLoadDone.current = true; return; }
		setIsDirty( true );
	}, [ config ] );

	// ── Fetch config on mount ────────────────────────────────────────────────

	useEffect( () => {
		if ( wizardId <= 0 ) {
			setConfig( STARTER_CONFIG );
			setIsFirstRun( true );
			return;
		}

		fetch( `${ apiBase }config/${ wizardId }`, { headers: { 'X-WP-Nonce': nonce } } )
			.then( ( r ) => r.ok ? r.json() : Promise.reject( r ) )
			.then( ( data ) => setConfig( data ) )
			.catch( () => {
				setConfig( STARTER_CONFIG );
				setIsFirstRun( true );
			} );
	}, [] );

	// ── Fetch features on mount ──────────────────────────────────────────────

	useEffect( () => {
		fetch( `${ apiBase }features`, { headers: { 'X-WP-Nonce': nonce } } )
			.then( ( r ) => r.ok ? r.json() : [] )
			.then( ( data ) => setFeatures( Array.isArray( data ) ? data : [] ) )
			.catch( () => {} );
	}, [] );

	// ── Sidebar question drag-and-drop ───────────────────────────────────────

	useEffect( () => {
		if ( ! questionsListRef.current ) return;

		const sortable = new Sortable( questionsListRef.current, {
			animation: 150,
			handle:    '.gw-drag-handle',
			onEnd: ( evt ) => {
				if ( evt.oldIndex === evt.newIndex ) return;
				const current = configRef.current;
				if ( ! current ) return;
				const updated = [ ...current.questions ];
				const [ moved ] = updated.splice( evt.oldIndex, 1 );
				updated.splice( evt.newIndex, 0, moved );
				setConfig( ( c ) => ( { ...c, questions: updated } ) );
			},
		} );

		return () => sortable.destroy();
	}, [ !! config ] );

	// ── Config updaters ──────────────────────────────────────────────────────

	function handleFeaturesChange( newFeatures ) {
		const newIds    = new Set( newFeatures.map( ( f ) => f.id ) );
		const hasDeleted = features.some( ( f ) => ! newIds.has( f.id ) );
		setFeatures( newFeatures );
		if ( hasDeleted && config ) {
			setConfig( ( c ) => ( {
				...c,
				plans: c.plans.map( ( p ) => ( {
					...p,
					features: ( p.features || [] ).filter( ( id ) => newIds.has( id ) ),
				} ) ),
			} ) );
		}
	}

	// Called by SettingsTab after a JSON import that includes a features array.
	async function handleFeaturesImport( newFeatures ) {
		if ( ! Array.isArray( newFeatures ) || newFeatures.length === 0 ) return;
		setFeatures( newFeatures );
		try {
			await fetch( `${ apiBase }features`, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
				body:    JSON.stringify( newFeatures ),
			} );
		} catch { /* non-fatal — user can still save manually */ }
	}

	const updateQuestion = useCallback( ( updated ) => {
		setConfig( ( c ) => ( {
			...c,
			questions: c.questions.map( ( q ) => q.id === updated.id ? updated : q ),
		} ) );
	}, [] );

	const updatePlan = useCallback( ( updated ) => {
		setConfig( ( c ) => ( {
			...c,
			plans: c.plans.map( ( p ) => p.slug === updated.slug ? updated : p ),
		} ) );
	}, [] );

	function addQuestion() {
		const newQ = {
			id:      Date.now(),
			text:    '',
			answers: [
				{ id: `a_${ Date.now() }`, label: '', weights: Object.fromEntries( config.plans.map( ( p ) => [ p.slug, 0 ] ) ) },
			],
		};
		setConfig( ( c ) => ( { ...c, questions: [ ...c.questions, newQ ] } ) );
		setSelectedId( `question_${ newQ.id }` );
	}

	function deleteQuestion( id ) {
		setConfig( ( c ) => ( { ...c, questions: c.questions.filter( ( q ) => q.id !== id ) } ) );
		if ( selectedId === `question_${ id }` ) setSelectedId( null );
	}

	function addPlan() {
		const slug = `plan_${ Date.now() }`;
		const newPlan = {
			slug,
			tier:        config.plans.length + 1,
			name:        '',
			price:       '',
			description: '',
			ctaLabel:    __( 'Get Started', 'guidwell' ),
			ctaUrl:      '#',
		};
		setConfig( ( c ) => ( {
			...c,
			plans: [ ...c.plans, newPlan ],
			questions: c.questions.map( ( q ) => ( {
				...q,
				answers: q.answers.map( ( a ) => ( {
					...a,
					weights: { ...a.weights, [ slug ]: 0 },
				} ) ),
			} ) ),
		} ) );
		setSelectedId( `plan_${ slug }` );
	}

	function deletePlan( slug ) {
		if ( config.plans.length <= 2 ) return;
		setConfig( ( c ) => {
			const plans = c.plans
				.filter( ( p ) => p.slug !== slug )
				.map( ( p, i ) => ( { ...p, tier: i + 1 } ) );
			const newMax = plans.length;
			const questions = c.questions.map( ( q ) => ( {
				...q,
				answers: q.answers.map( ( a ) => {
					const { [ slug ]: _removed, ...rest } = a.weights;
					const clamped = Object.fromEntries(
						Object.entries( rest ).map( ( [ k, v ] ) => [ k, Math.min( v, newMax ) ] )
					);
					return { ...a, weights: clamped };
				} ),
			} ) );
			return { ...c, plans, questions };
		} );
		if ( selectedId === `plan_${ slug }` ) setSelectedId( null );
	}

	// ── Save ─────────────────────────────────────────────────────────────────

	async function handleSave() {
		// Features tab autosaves — nothing to do.
		if ( activeTab === 'features' ) return;

		// Settings and Notifications tabs register their own save function via tabSaveRef.
		if ( activeTab === 'settings' || activeTab === 'notifications' ) {
			if ( tabSaveRef.current ) await tabSaveRef.current();
			return;
		}

		// Builder / Logic tabs: save wizard config.
		setSavingStatus( 'saving' );
		setNotification( null );

		try {
			let currentWizardId = wizardId;

			if ( currentWizardId <= 0 ) {
				const res  = await fetch( `${ apiBase }wizard`, {
					method:  'POST',
					headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
					body:    JSON.stringify( { title: __( 'My Wizard', 'guidwell' ) } ),
				} );
				if ( ! res.ok ) throw new Error( await res.text() );
				const data = await res.json();
				currentWizardId = data.id;
				setWizardId( currentWizardId );
			}

			const res = await fetch( `${ apiBase }config/${ currentWizardId }`, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
				body:    JSON.stringify( config ),
			} );

			if ( ! res.ok ) {
				const err = await res.json().catch( () => ( {} ) );
				throw new Error( err.message || `HTTP ${ res.status }` );
			}

			setSavingStatus( 'success' );
			setIsFirstRun( false );
			setIsDirty( false );
			setTimeout( () => setSavingStatus( 'idle' ), 2000 );
		} catch ( err ) {
			setSavingStatus( 'error' );
			setNotification( { type: 'error', message: err.message || __( 'Save failed. Please try again.', 'guidwell' ) } );
		}
	}

	// ── Derived ──────────────────────────────────────────────────────────────

	const selectedQuestion = config?.questions.find( ( q ) => selectedId === `question_${ q.id }` ) ?? null;
	const selectedPlan     = config?.plans.find( ( p ) => selectedId === `plan_${ p.slug }` ) ?? null;

	const isConfigTab   = activeTab === 'builder' || activeTab === 'logic';
	const isAutoSaveTab = activeTab === 'features';

	const saveLabel = isAutoSaveTab        ? __( 'Auto-saves', 'guidwell' )
		: savingStatus === 'saving'  ? null
		: savingStatus === 'success' ? __( 'Saved ✓', 'guidwell' )
		: savingStatus === 'error'   ? __( 'Error — try again', 'guidwell' )
		: __( 'Save', 'guidwell' );

	const btnDisabled = isAutoSaveTab
		|| savingStatus === 'saving'
		|| ( isConfigTab && ! isDirty && savingStatus === 'idle' );

	const saveBtnClass = [
		'gw-btn-save',
		isAutoSaveTab                                                    ? 'gw-btn-save--disabled' : '',
		savingStatus === 'success'                                       ? 'gw-btn-save--success'  : '',
		savingStatus === 'error'                                         ? 'gw-btn-save--error'    : '',
		isConfigTab && ! isDirty && savingStatus === 'idle'              ? 'gw-btn-save--disabled' : '',
	].filter( Boolean ).join( ' ' );

	// ── Render ───────────────────────────────────────────────────────────────

	if ( ! config ) {
		return (
			<div id="guidwell-admin">
				<p style={ { color: '#6b7280', padding: '40px 0' } }>{ __( 'Loading…', 'guidwell' ) }</p>
			</div>
		);
	}

	return (
		<div id="guidwell-admin">
			<div className="gw-tabs">
				<button className={ `gw-tab${ activeTab === 'builder'       ? ' gw-tab--active' : '' }` } onClick={ () => setActiveTab( 'builder' ) }>
					{ __( 'Wizard Builder', 'guidwell' ) }
				</button>
				<button className={ `gw-tab${ activeTab === 'logic'         ? ' gw-tab--active' : '' }` } onClick={ () => setActiveTab( 'logic' ) }>
					{ __( 'Logic', 'guidwell' ) }
					{ config?.mode === 'tree' && (
						<span className="gw-tab__badge">{ __( 'ON', 'guidwell' ) }</span>
					) }
				</button>
				<button className={ `gw-tab${ activeTab === 'features'      ? ' gw-tab--active' : '' }` } onClick={ () => setActiveTab( 'features' ) }>
					{ __( 'Features', 'guidwell' ) }
				</button>
				<button className={ `gw-tab${ activeTab === 'settings'      ? ' gw-tab--active' : '' }` } onClick={ () => setActiveTab( 'settings' ) }>
					{ __( 'Settings', 'guidwell' ) }
				</button>
				<button className={ `gw-tab${ activeTab === 'notifications' ? ' gw-tab--active' : '' }` } onClick={ () => setActiveTab( 'notifications' ) }>
					{ __( 'Notifications', 'guidwell' ) }
				</button>
				<button
					className={ saveBtnClass }
					onClick={ handleSave }
					disabled={ btnDisabled }
				>
					{ savingStatus === 'saving' && <span className="gw-btn-spinner" /> }
					{ saveLabel }
				</button>
			</div>

			{ notification && (
				<div className={ `gw-notice gw-notice--${ notification.type }` }>
					<span>{ notification.message }</span>
					<button className="gw-notice__dismiss" onClick={ () => setNotification( null ) } aria-label={ __( 'Dismiss', 'guidwell' ) }>×</button>
				</div>
			) }

			{ activeTab === 'logic' ? (
				<LogicTab
					config={ config }
					onConfigChange={ setConfig }
				/>
			) : activeTab === 'features' ? (
				<FeaturesTab
					features={ features }
					onFeaturesChange={ handleFeaturesChange }
					apiBase={ apiBase }
					nonce={ nonce }
				/>
			) : activeTab === 'settings' ? (
				<SettingsTab
					initialSettings={ INITIAL_SETTINGS }
					apiBase={ apiBase }
					nonce={ nonce }
					onNotify={ setNotification }
					onSavingChange={ setSavingStatus }
					saveRef={ tabSaveRef }
					config={ config }
					onConfigChange={ setConfig }
					features={ features }
					onFeaturesImport={ handleFeaturesImport }
				/>
			) : activeTab === 'notifications' ? (
				<NotificationsTab
					apiBase={ apiBase }
					nonce={ nonce }
					onNotify={ setNotification }
					onSavingChange={ setSavingStatus }
					saveRef={ tabSaveRef }
				/>
			) : (
				<>
					{ isFirstRun && (
						<div className="gw-notice gw-notice--info">
							<span>{ __( "No wizard found. We've loaded a starter template — customize it and click Save to create your wizard.", 'guidwell' ) }</span>
							<button className="gw-notice__dismiss" onClick={ () => setIsFirstRun( false ) } aria-label={ __( 'Dismiss', 'guidwell' ) }>×</button>
						</div>
					) }

					<div className="gw-builder">
						{ /* ── Sidebar ── */ }
						<aside className="gw-sidebar">
							<div className="gw-sidebar-section">
								<p className="gw-sidebar-heading">{ __( 'Questions', 'guidwell' ) }</p>
								<ul className="gw-sidebar-list" ref={ questionsListRef }>
									{ config.questions.map( ( q ) => (
										<li
											key={ q.id }
											className={ `gw-sidebar-item${ selectedId === `question_${ q.id }` ? ' gw-sidebar-item--active' : '' }` }
											onClick={ () => setSelectedId( `question_${ q.id }` ) }
										>
											<span className="gw-drag-handle" title={ __( 'Drag to reorder', 'guidwell' ) }>&#9776;</span>
											<span className="gw-sidebar-item__label">
												{ q.text ? q.text.slice( 0, 40 ) + ( q.text.length > 40 ? '…' : '' ) : <em style={ { opacity: 0.5 } }>{ __( '(untitled)', 'guidwell' ) }</em> }
											</span>
											<button
												className="gw-sidebar-item__delete"
												onClick={ ( e ) => { e.stopPropagation(); deleteQuestion( q.id ); } }
												aria-label={ __( 'Delete question', 'guidwell' ) }
											>×</button>
										</li>
									) ) }
								</ul>
							</div>

							<div style={ { padding: '0 16px 8px' } }>
								{ QUESTION_LIMIT !== null && config.questions.length >= QUESTION_LIMIT ? (
									<div className="gw-tier-gate">
										<span className="gw-tier-gate__icon" aria-hidden="true">🔒</span>
										<span className="gw-tier-gate__text">
											{ __( 'Question limit reached', 'guidwell' ) }
											{ ' ' }
											<span className="gw-tier-gate__count">
												({ config.questions.length }/{ QUESTION_LIMIT })
											</span>
										</span>
										<a
											href={ UPGRADE_URL }
											target="_blank"
											rel="noreferrer"
											className="gw-tier-gate__link"
										>
											{ __( 'Upgrade to add more →', 'guidwell' ) }
										</a>
									</div>
								) : (
									<button className="gw-btn-add" onClick={ addQuestion }>
										+ { __( 'Add Question', 'guidwell' ) }
									</button>
								) }
							</div>

							<hr className="gw-sidebar-divider" />

							<div className="gw-sidebar-section">
								<p className="gw-sidebar-heading">{ __( 'Plans', 'guidwell' ) }</p>
								<ul className="gw-sidebar-list">
									{ config.plans.map( ( p ) => (
										<li
											key={ p.slug }
											className={ `gw-sidebar-item${ selectedId === `plan_${ p.slug }` ? ' gw-sidebar-item--active' : '' }` }
											onClick={ () => setSelectedId( `plan_${ p.slug }` ) }
										>
											<span className="gw-sidebar-item__label">
												{ p.name || <em style={ { opacity: 0.5 } }>{ __( '(untitled)', 'guidwell' ) }</em> }
											</span>
											{ config.plans.length > 2 && (
												<button
													className="gw-sidebar-item__delete"
													onClick={ ( e ) => { e.stopPropagation(); deletePlan( p.slug ); } }
													aria-label={ __( 'Delete plan', 'guidwell' ) }
												>×</button>
											) }
										</li>
									) ) }
								</ul>
							</div>

							<div style={ { padding: '0 16px 8px' } }>
								<button className="gw-btn-add" onClick={ addPlan }>
									+ { __( 'Add Plan', 'guidwell' ) }
								</button>
							</div>

						</aside>

						{ /* ── Right panel ── */ }
						<main className="gw-panel">
							{ selectedQuestion && (
								<QuestionEditor
									key={ selectedQuestion.id }
									question={ selectedQuestion }
									plans={ config.plans }
									onUpdate={ updateQuestion }
								/>
							) }
							{ selectedPlan && (
								<PlanEditor
									key={ selectedPlan.slug }
									plan={ selectedPlan }
									onUpdate={ updatePlan }
									features={ features }
									onGoToFeaturesTab={ () => setActiveTab( 'features' ) }
								/>
							) }
							{ ! selectedQuestion && ! selectedPlan && (
								<div className="gw-panel-placeholder">
									{ __( 'Select a question or plan to edit', 'guidwell' ) }
								</div>
							) }
						</main>
					</div>
				</>
			) }
		</div>
	);
}
