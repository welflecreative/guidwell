import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { __, sprintf } from '@wordpress/i18n';

const {
	tier: TIER_DATA = {},
} = window.guidwellAdminData || {};

const CAN_USE     = TIER_DATA?.features?.conditional_logic?.allowed ?? false;
const UPGRADE_URL = TIER_DATA?.upgrade_url || 'https://welflecreative.com/guidwell';
const DEPTH_LIMIT = TIER_DATA?.limits?.logic_tree_depth ?? null;
const NODE_LIMIT  = TIER_DATA?.limits?.logic_tree_nodes  ?? null;

const NODE_W         = 240;
const NODE_HEADER_H  = 44;
const ANSWER_ROW_H   = 36;
const NODE_PADDING   = 12;
const COLLAPSED_W    = 80;   // width of a collapsed chain child (1/3 of full card)
const CHAIN_GAP      = 0;    // px gap between chained cards (flush)
const SNAP_DISTANCE  = 60;   // px horizontal radius for chain snap (header alignment only)
const UNCHAIN_DIST   = 80;   // px dragged away before chain breaks

// ── Locked state ─────────────────────────────────────────────────────────────

function LockedState() {
	const msg = TIER_DATA?.features?.conditional_logic?.upgrade_message
		|| __( 'Upgrade to build branching wizards where each answer leads down a different path.', 'guidwell' );

	return (
		<div className="gw-logic-locked">
			<div className="gw-logic-locked__icon" aria-hidden="true">🔒</div>
			<h3 className="gw-logic-locked__title">{ __( 'Conditional Logic Trees', 'guidwell' ) }</h3>
			<p className="gw-logic-locked__msg">{ msg }</p>
			<a href={ UPGRADE_URL } target="_blank" rel="noreferrer" className="gw-btn-primary">
				{ __( 'Upgrade to unlock →', 'guidwell' ) }
			</a>
		</div>
	);
}

// ── Enable screen ─────────────────────────────────────────────────────────────

function EnableTreeMode( { onEnable } ) {
	return (
		<div className="gw-logic-enable">
			<div className="gw-logic-enable__icon" aria-hidden="true">🌿</div>
			<h3 className="gw-logic-enable__title">{ __( 'Branching is not yet enabled for this wizard', 'guidwell' ) }</h3>
			<p className="gw-logic-enable__desc">
				{ __( 'Switch to tree mode to connect each answer to a specific next question. Visitors will follow the path that matches their choices.', 'guidwell' ) }
			</p>
			{ ( DEPTH_LIMIT !== null || NODE_LIMIT !== null ) && (
				<p className="gw-logic-enable__limits">
					{ DEPTH_LIMIT !== null && NODE_LIMIT !== null && sprintf(
						/* translators: 1: node limit, 2: depth limit */
						__( 'Your plan allows up to %1$d nodes and %2$d levels deep.', 'guidwell' ),
						NODE_LIMIT, DEPTH_LIMIT
					) }
					{ DEPTH_LIMIT !== null && NODE_LIMIT === null && sprintf(
						/* translators: %d: depth limit */
						__( 'Your plan allows up to %d levels deep.', 'guidwell' ),
						DEPTH_LIMIT
					) }
					{ NODE_LIMIT !== null && DEPTH_LIMIT === null && sprintf(
						/* translators: %d: node limit */
						__( 'Your plan allows up to %d nodes.', 'guidwell' ),
						NODE_LIMIT
					) }
				</p>
			) }
			<button className="gw-btn-primary" onClick={ onEnable }>
				{ __( 'Enable branching for this wizard', 'guidwell' ) }
			</button>
		</div>
	);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPortPos( nodePos, answerIndex ) {
	return {
		x: nodePos.x + NODE_W,
		y: nodePos.y + NODE_HEADER_H + answerIndex * ANSWER_ROW_H + ANSWER_ROW_H / 2,
	};
}

// Wires always land on the left-center of the target card header.
function getNodeEntryPos( nodePos ) {
	return {
		x: nodePos.x,
		y: nodePos.y + NODE_HEADER_H / 2,
	};
}

function bezierPath( fx, fy, tx, ty ) {
	const dx   = Math.abs( tx - fx );
	const ctrl = Math.max( 60, dx * 0.45 );
	return `M ${ fx } ${ fy } C ${ fx + ctrl } ${ fy }, ${ tx - ctrl } ${ ty }, ${ tx } ${ ty }`;
}

function fullNodeHeight( q ) {
	return NODE_HEADER_H + q.answers.length * ANSWER_ROW_H + NODE_PADDING;
}

// Width depends on whether the card is collapsed in a chain.
function nodeDisplayWidth( isCollapsed ) {
	return isCollapsed ? COLLAPSED_W : NODE_W;
}

// ── Chain helpers ─────────────────────────────────────────────────────────────

function buildChainedChildSet( questions ) {
	const set = new Set();
	questions.forEach( q => { if ( q.defaultNext != null ) set.add( q.defaultNext ); } );
	return set;
}

// Chain children are positioned horizontally to the right of their parent.
// Pass draggingId to let the dragged card use its live positions[] coords
// instead of the computed chain position, so it visually moves during drag.
// Descendants of the dragged card follow it automatically.
function computeEffectivePositions( questions, positions, chainedChildSet, draggingId = null ) {
	const result  = { ...positions };
	const visited = new Set();

	questions.forEach( q => {
		if ( chainedChildSet.has( q.id ) || q.defaultNext == null ) return;

		let parentQ   = q;
		let parentPos = result[ q.id ];
		visited.add( q.id );

		while ( parentQ.defaultNext != null ) {
			const childId = parentQ.defaultNext;
			if ( visited.has( childId ) ) break;
			const childQ = questions.find( cq => cq.id === childId );
			if ( ! childQ || ! parentPos ) break;

			// Skip chain override for the card being dragged; its positions[id]
			// already holds the live drag coordinates set by onMouseMove.
			if ( childId !== draggingId ) {
				const parentIsChild   = chainedChildSet.has( parentQ.id );
				const parentCollapsed = parentIsChild && ! parentQ.answers.some( a => a.next != null );
				const parentW         = nodeDisplayWidth( parentCollapsed );
				result[ childId ] = {
					x: parentPos.x + parentW + CHAIN_GAP,
					y: parentPos.y,
				};
			}

			visited.add( childId );
			parentPos = result[ childId ]; // dragged card's live pos flows to descendants
			parentQ   = childQ;
		}
	} );

	return result;
}

function defaultLayout( questions ) {
	const cols = 3;
	const colW = NODE_W + 120;
	const rowH = 300;
	const layout = {};
	questions.forEach( ( q, i ) => {
		layout[ q.id ] = {
			x: 40 + ( i % cols ) * colW,
			y: 40 + Math.floor( i / cols ) * rowH,
		};
	} );
	return layout;
}

// ── Tree Canvas ───────────────────────────────────────────────────────────────

function TreeCanvas( { config, onConfigChange } ) {
	const questions = config.questions;
	const entryQId  = questions[ 0 ]?.id;

	const [ positions, setPositions ] = useState( () => {
		const saved    = config._layout || {};
		const fallback = defaultLayout( questions );
		const merged   = { ...fallback };
		Object.keys( saved ).forEach( k => { merged[ k ] = saved[ k ]; } );
		return merged;
	} );

	const [ snapTargetId, setSnapTargetId ] = useState( null );
	const [ draggingId,   setDraggingId   ] = useState( null );

	useEffect( () => {
		setPositions( prev => {
			let changed = false;
			const next  = { ...prev };
			questions.forEach( ( q, i ) => {
				if ( ! next[ q.id ] ) {
					next[ q.id ] = {
						x: 40 + ( i % 3 ) * ( NODE_W + 120 ),
						y: 40 + Math.floor( i / 3 ) * 300,
					};
					changed = true;
				}
			} );
			return changed ? next : prev;
		} );
	}, [ questions ] );

	const persistLayout = useCallback( newPositions => {
		onConfigChange( { ...config, _layout: newPositions } );
	}, [ config, onConfigChange ] );

	const chainedChildSet = useMemo( () => buildChainedChildSet( questions ), [ questions ] );

	const effectivePositions = useMemo(
		() => computeEffectivePositions( questions, positions, chainedChildSet, draggingId ),
		[ questions, positions, chainedChildSet, draggingId ]
	);

	// Stable refs so drag closures always see the latest values.
	const questionsRef       = useRef( questions );
	const effectivePosRef    = useRef( effectivePositions );
	const chainedChildSetRef = useRef( chainedChildSet );
	const configRef          = useRef( config );
	const onConfigChangeRef  = useRef( onConfigChange );

	useEffect( () => { questionsRef.current       = questions;          }, [ questions ] );
	useEffect( () => { effectivePosRef.current     = effectivePositions; }, [ effectivePositions ] );
	useEffect( () => { chainedChildSetRef.current  = chainedChildSet;    }, [ chainedChildSet ] );
	useEffect( () => { configRef.current           = config;             }, [ config ] );
	useEffect( () => { onConfigChangeRef.current   = onConfigChange;     }, [ onConfigChange ] );

	// ── Dragging ──────────────────────────────────────────────────────────────

	const dragging = useRef( null );
	const canvasRef = useRef( null );

	function getChainParentId( qId ) {
		return questionsRef.current.find( q => q.defaultNext === qId )?.id ?? null;
	}

	function getChainDescendantIds( rootId ) {
		const qs      = questionsRef.current;
		const result  = [];
		const visited = new Set( [ rootId ] );
		let cur       = qs.find( q => q.id === rootId );
		while ( cur?.defaultNext != null && ! visited.has( cur.defaultNext ) ) {
			visited.add( cur.defaultNext );
			result.push( cur.defaultNext );
			cur = qs.find( q => q.id === cur.defaultNext );
		}
		return result;
	}

	function onNodeMouseDown( e, qId ) {
		if ( e.button !== 0 ) return;
		e.stopPropagation();
		// Use the effective (rendered) position as the drag origin so chain children
		// move naturally from where they actually appear on screen, not their raw
		// positions[] value which may not reflect chain-computed placement.
		const pos = effectivePositions[ qId ] || positions[ qId ] || { x: 0, y: 0 };
		setPositions( prev => ( { ...prev, [ qId ]: pos } ) ); // sync so drag deltas are correct
		setDraggingId( qId ); // exclude from chain override in computeEffectivePositions
		dragging.current = {
			qId,
			startMouseX:   e.clientX,
			startMouseY:   e.clientY,
			origX:         pos.x,
			origY:         pos.y,
			chainParentId: getChainParentId( qId ),
			snapTarget:    null,
		};
	}

	useEffect( () => {
		function onMouseMove( e ) {
			if ( ! dragging.current ) return;
			const { qId, startMouseX, startMouseY, origX, origY, chainParentId } = dragging.current;
			const newX = Math.max( 0, origX + ( e.clientX - startMouseX ) );
			const newY = Math.max( 0, origY + ( e.clientY - startMouseY ) );

			const qs       = questionsRef.current;
			const effPos   = effectivePosRef.current;
			const childSet = chainedChildSetRef.current;

			let snap = null;

			// Run snap detection for free nodes AND for chain children being dragged away
			// from their parent — this lets a single drag re-chain to a different card.
			// Chain parents (cards that already have a defaultNext set) are excluded
			// naturally by the `q.defaultNext != null` check inside the loop, including
			// the current parent (which still has defaultNext === qId in the data).
			if ( ! childSet.has( qId ) || chainParentId ) {
				const descendants = new Set( getChainDescendantIds( qId ) );

				// Cards that are targeted by any answer wire (branched-to).
				const branchedToIds = new Set(
					qs.flatMap( q2 => q2.answers.filter( a => a.next != null ).map( a => a.next ) )
				);

				for ( const q of qs ) {
					if ( q.id === qId ) continue;
					if ( descendants.has( q.id ) ) continue;
					if ( q.defaultNext != null ) continue; // already has a chain child

					// Allow snap to cards that send branches, receive branches, or are already in a chain.
					const hasBranches  = q.answers.some( a => a.next != null );
					const isBranchedTo = branchedToIds.has( q.id );
					const isInChain    = childSet.has( q.id );
					if ( ! hasBranches && ! isBranchedTo && ! isInChain ) continue;

					const pos = effPos[ q.id ];
					if ( ! pos ) continue;

					const isQChild     = childSet.has( q.id );
					// Tail cards (chain child with no defaultNext) render at full width even
					// when collapsed, so use NODE_W for snap alignment.
					const isQTail      = isQChild && q.defaultNext == null;
					const isQCollapsed = isQChild && ! q.answers.some( a => a.next != null ) && ! isQTail;
					const qW           = nodeDisplayWidth( isQCollapsed );
					const qH           = fullNodeHeight( q );

					// Snap only when headers are vertically aligned and the dragged card is
					// horizontally close to the target's right edge.
					const headerDy = Math.abs( newY - pos.y );
					const headerDx = Math.abs( newX - ( pos.x + qW ) );

					if ( headerDy < NODE_HEADER_H && headerDx < SNAP_DISTANCE ) {
						snap = { toQId: q.id, snapX: pos.x + qW + CHAIN_GAP, snapY: pos.y };
						break;
					}
				}
			}

			dragging.current.snapTarget = snap;
			setSnapTargetId( snap ? snap.toQId : null );

			const dragPos = snap ? { x: snap.snapX, y: snap.snapY } : { x: newX, y: newY };
			setPositions( prev => ( { ...prev, [ qId ]: dragPos } ) );
		}

		function onMouseUp() {
			if ( ! dragging.current ) return;
			const { qId, snapTarget, chainParentId, origX, origY } = dragging.current;
			dragging.current = null;
			setDraggingId( null ); // restore chain-computed positioning
			setSnapTargetId( null );

			const cfg      = configRef.current;
			const qs       = questionsRef.current;
			const effPos   = effectivePosRef.current;
			const onChange = onConfigChangeRef.current;

			if ( snapTarget ) {
				// For chain children snapping to a new card: also break the old chain.
				const newQuestions = qs.map( q => {
					if ( chainParentId && q.id === chainParentId ) {
						const { defaultNext: _dn, ...rest } = q; // remove old chain link
						return rest;
					}
					if ( q.id === snapTarget.toQId ) {
						return { ...q, defaultNext: qId }; // attach to new parent
					}
					return q;
				} );
				setPositions( prev => {
					const next = { ...prev, [ qId ]: { x: snapTarget.snapX, y: snapTarget.snapY } };
					onChange( { ...cfg, questions: newQuestions, _layout: next } );
					return next;
				} );
			} else if ( chainParentId ) {
				// Dragging a chain child — check if it moved far enough to break the chain.
				setPositions( prev => {
					const currentPos = prev[ qId ];
					const parentPos  = effPos[ chainParentId ];

					if ( currentPos && parentPos ) {
						const parent      = qs.find( q => q.id === chainParentId );
						const pIsChild    = chainedChildSetRef.current.has( chainParentId );
						const pCollapsed  = pIsChild && ! parent.answers.some( a => a.next != null );
						const pW          = nodeDisplayWidth( pCollapsed );
						const expectedX   = parentPos.x + pW + CHAIN_GAP;
						const dist = Math.sqrt(
							Math.pow( currentPos.x - expectedX, 2 ) +
							Math.pow( currentPos.y - parentPos.y, 2 )
						);
						if ( dist > UNCHAIN_DIST ) {
							const newQuestions = qs.map( q => {
								if ( q.id !== chainParentId ) return q;
								const { defaultNext: _dn, ...rest } = q;
								return rest;
							} );
							onChange( { ...cfg, questions: newQuestions, _layout: prev } );
							return prev;
						}
						// Not far enough — snap back to chain position derived from parent.
						const chainPos = { x: expectedX, y: parentPos.y };
						const next     = { ...prev, [ qId ]: chainPos };
						persistLayout( next );
						return next;
					}

					// Fallback snap-back.
					const next = { ...prev, [ qId ]: { x: origX, y: origY } };
					persistLayout( next );
					return next;
				} );
			} else {
				setPositions( prev => {
					persistLayout( prev );
					return prev;
				} );
			}
		}

		window.addEventListener( 'mousemove', onMouseMove );
		window.addEventListener( 'mouseup',   onMouseUp );
		return () => {
			window.removeEventListener( 'mousemove', onMouseMove );
			window.removeEventListener( 'mouseup',   onMouseUp );
		};
	}, [ persistLayout ] );

	// ── Wire drawing ──────────────────────────────────────────────────────────

	const [ pendingWire, setPendingWire ] = useState( null );
	const [ mousePos,    setMousePos    ] = useState( { x: 0, y: 0 } );

	function onCanvasMouseMove( e ) {
		if ( ! pendingWire ) return;
		const el   = canvasRef.current;
		const rect = el?.getBoundingClientRect();
		if ( ! rect ) return;
		setMousePos( { x: e.clientX - rect.left + el.scrollLeft, y: e.clientY - rect.top + el.scrollTop } );
	}

	function onPortClick( e, qId, answerId ) {
		e.stopPropagation();
		if ( pendingWire ) { setPendingWire( null ); return; }
		const el   = canvasRef.current;
		const rect = el?.getBoundingClientRect();
		if ( rect ) setMousePos( { x: e.clientX - rect.left + el.scrollLeft, y: e.clientY - rect.top + el.scrollTop } );
		setPendingWire( { fromQId: qId, fromAnswerId: answerId } );
	}

	function onNodeClick( e, targetQId ) {
		if ( ! pendingWire ) return;
		e.stopPropagation();
		const { fromQId, fromAnswerId } = pendingWire;
		if ( fromQId === targetQId ) { setPendingWire( null ); return; }
		const newQuestions = questions.map( q => {
			if ( q.id !== fromQId ) return q;
			return {
				...q,
				answers: q.answers.map( a =>
					a.id === fromAnswerId ? { ...a, next: targetQId } : a
				),
			};
		} );
		onConfigChange( { ...config, questions: newQuestions } );
		setPendingWire( null );
	}

	function onCanvasClick() {
		if ( pendingWire ) setPendingWire( null );
	}

	function removeConnection( qId, answerId ) {
		const newQuestions = questions.map( q => {
			if ( q.id !== qId ) return q;
			return {
				...q,
				answers: q.answers.map( a => {
					if ( a.id !== answerId ) return a;
					const { next: _n, ...rest } = a;
					return rest;
				} ),
			};
		} );
		onConfigChange( { ...config, questions: newQuestions } );
	}

	// ── Canvas bounds ─────────────────────────────────────────────────────────

	const canvasW = Math.max( 900, ...questions.map( q => {
		const pos = effectivePositions[ q.id ];
		if ( ! pos ) return 0;
		const isChild     = chainedChildSet.has( q.id );
		const isCollapsed = isChild && ! q.answers.some( a => a.next != null );
		return pos.x + nodeDisplayWidth( isCollapsed ) + 80;
	} ) );

	const canvasH = Math.max( 600, ...questions.map( q => {
		const pos = effectivePositions[ q.id ];
		if ( ! pos ) return 0;
		return pos.y + fullNodeHeight( q ) + 80;
	} ) );

	// ── Connections ───────────────────────────────────────────────────────────

	const connections = [];
	questions.forEach( q => {
		q.answers.forEach( ( a, ai ) => {
			if ( a.next == null ) return;
			const fromPos = effectivePositions[ q.id ];
			const toPos   = effectivePositions[ a.next ];
			if ( ! fromPos || ! toPos ) return;
			const from = getPortPos( fromPos, ai );
			const to   = getNodeEntryPos( toPos );
			connections.push( { key: `${ q.id }-${ a.id }`, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y } );
		} );
	} );

	let pendingPath = null;
	if ( pendingWire ) {
		const srcQ    = questions.find( q => q.id === pendingWire.fromQId );
		const fromPos = effectivePositions[ pendingWire.fromQId ];
		if ( fromPos && srcQ ) {
			const ai   = srcQ.answers.findIndex( a => a.id === pendingWire.fromAnswerId );
			const from = getPortPos( fromPos, ai );
			pendingPath = bezierPath( from.x, from.y, mousePos.x, mousePos.y );
		}
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className="gw-tree-wrap">
			<div className="gw-tree-toolbar">
				<span className="gw-tree-hint">
					{ pendingWire
						? __( 'Click a node to connect — or click here to cancel', 'guidwell' )
						: __( 'Drag a card\'s right edge onto another card to chain questions linearly. Click an answer row to draw a branch.', 'guidwell' )
					}
				</span>
				{ pendingWire && (
					<button className="gw-btn-secondary" onClick={ () => setPendingWire( null ) }>
						{ __( 'Cancel', 'guidwell' ) }
					</button>
				) }
			</div>

			<div
				className={ `gw-tree-canvas${ pendingWire ? ' gw-tree-canvas--connecting' : '' }` }
				ref={ canvasRef }
				style={ { minWidth: canvasW, minHeight: canvasH } }
				onMouseMove={ onCanvasMouseMove }
				onClick={ onCanvasClick }
			>
				<svg
					className="gw-tree-svg"
					width={ canvasW }
					height={ canvasH }
					style={ { pointerEvents: 'none' } }
				>
					{ connections.map( c => (
						<path
							key={ c.key }
							d={ bezierPath( c.fromX, c.fromY, c.toX, c.toY ) }
							className="gw-wire"
						/>
					) ) }
					{ pendingPath && <path d={ pendingPath } className="gw-wire gw-wire--pending" /> }
					<defs>
						<marker id="gw-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
							<path d="M0,0 L0,6 L8,3 z" fill="#4a90a4" />
						</marker>
						<marker id="gw-arrow-pending" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
							<path d="M0,0 L0,6 L8,3 z" fill="#9ca3af" />
						</marker>
					</defs>
				</svg>

				{ questions.map( q => {
					const pos             = effectivePositions[ q.id ] || { x: 0, y: 0 };
					const isEntry         = q.id === entryQId;
					const isTarget        = pendingWire && pendingWire.fromQId !== q.id;
					const isSource        = pendingWire && pendingWire.fromQId === q.id;
					const isChainChild    = chainedChildSet.has( q.id );
					const isChainParent   = q.defaultNext != null;
					const isChainTail     = isChainChild && ! isChainParent; // last card in chain
					const isSnapTarget    = snapTargetId === q.id;
					const hasAnswerBranch = q.answers.some( a => a.next != null );

					// Collapsed when: it's a chain child with no answer branches and not a wire source.
					// Tail cards are also collapsed (answers hidden) but rendered at full width via CSS.
					const isCollapsed = isChainChild && ! hasAnswerBranch && ! isSource;

					return (
						<div
							key={ q.id }
							className={ [
								'gw-tree-node',
								isEntry       ? 'gw-tree-node--entry'        : '',
								isTarget      ? 'gw-tree-node--target'       : '',
								isSource      ? 'gw-tree-node--source'       : '',
								isChainChild  ? 'gw-tree-node--chain-child'  : '',
								isChainParent ? 'gw-tree-node--chain-parent' : '',
								isChainTail   ? 'gw-tree-node--chain-tail'   : '',
								isCollapsed   ? 'gw-tree-node--collapsed'    : '',
								isSnapTarget  ? 'gw-tree-node--snap-target'  : '',
							].join( ' ' ).trim() }
							style={ { left: pos.x, top: pos.y } }
							onClick={ e => { if ( pendingWire ) onNodeClick( e, q.id ); } }
						>
							<div
								className="gw-tree-node__header"
								onMouseDown={ e => onNodeMouseDown( e, q.id ) }
							>
								{ isEntry && (
									<span className="gw-tree-node__badge">{ __( 'Start', 'guidwell' ) }</span>
								) }
								<span className="gw-tree-node__title">
									{ q.text
										? q.text.slice( 0, 50 ) + ( q.text.length > 50 ? '…' : '' )
										: <em style={ { opacity: 0.5 } }>{ __( '(untitled)', 'guidwell' ) }</em>
									}
								</span>
							</div>

							{ ! isCollapsed && (
								<div className="gw-tree-node__answers">
									{ q.answers.map( ( a, ai ) => {
										const isConnected   = a.next != null;
										const targetQ       = isConnected ? questions.find( tq => tq.id === a.next ) : null;
										const isThisPending = pendingWire?.fromQId === q.id && pendingWire?.fromAnswerId === a.id;

										return (
											<div
												key={ a.id }
												className={ [
													'gw-tree-node__answer',
													isThisPending ? 'gw-tree-node__answer--pending' : '',
												].join( ' ' ).trim() }
												title={ isConnected
													? __( 'Click to rewire this answer', 'guidwell' )
													: __( 'Click to connect this answer to a node', 'guidwell' )
												}
												onClick={ e => {
													if ( pendingWire ) return; // let bubble up to node for wire completion
													e.stopPropagation();
													onPortClick( e, q.id, a.id );
												} }
											>
												<span className="gw-tree-node__answer-label">
													{ a.label || <em style={ { opacity: 0.4 } }>{ __( '(untitled)', 'guidwell' ) }</em> }
												</span>
												<span className="gw-tree-node__answer-target">
													{ isConnected && targetQ && (
														<span className="gw-tree-node__answer-target-name">
															{ targetQ.text
																? targetQ.text.slice( 0, 20 ) + ( targetQ.text.length > 20 ? '…' : '' )
																: __( '(untitled)', 'guidwell' )
															}
														</span>
													) }
													{ isConnected && ! targetQ && (
														<span className="gw-tree-node__answer-end">{ __( '→ Results', 'guidwell' ) }</span>
													) }
												</span>
												{ isConnected && (
													<button
														className="gw-tree-node__remove-wire"
														title={ __( 'Remove connection', 'guidwell' ) }
														onClick={ e => { e.stopPropagation(); removeConnection( q.id, a.id ); } }
													>×</button>
												) }
											</div>
										);
									} ) }
								</div>
							) }

							{ ! isCollapsed && (
								<div className="gw-tree-node__footer">
									{ isChainParent
										? __( '→ Continues in chain', 'guidwell' )
										: q.answers.some( a => a.next == null )
											? __( '↳ Unconnected answers → Results', 'guidwell' )
											: null
									}
								</div>
							) }
						</div>
					);
				} ) }
			</div>
		</div>
	);
}

// ── Public export ─────────────────────────────────────────────────────────────

export default function LogicTab( { config, onConfigChange } ) {
	if ( ! CAN_USE ) {
		return <LockedState />;
	}

	const isTreeMode = config?.mode === 'tree';

	function enableTreeMode() {
		onConfigChange( { ...config, mode: 'tree' } );
	}

	function disableTreeMode() {
		const { mode: _mode, _layout: _layout, ...rest } = config;
		const cleaned = {
			...rest,
			questions: config.questions.map( q => {
				const { defaultNext: _dn, ...qRest } = q;
				return {
					...qRest,
					answers: q.answers.map( a => {
						const { next: _next, ...aRest } = a;
						return aRest;
					} ),
				};
			} ),
		};
		onConfigChange( cleaned );
	}

	return (
		<div className="gw-logic">
			{ isTreeMode && (
				<div className="gw-logic-header">
					<div>
						<span className="gw-logic-header__title">{ __( 'Logic Tree', 'guidwell' ) }</span>
						<span className="gw-logic-header__hint">
							{ __( 'This wizard is in branching mode.', 'guidwell' ) }
						</span>
					</div>
					<button className="gw-btn-secondary" onClick={ disableTreeMode }>
						{ __( 'Switch back to linear', 'guidwell' ) }
					</button>
				</div>
			) }

			{ isTreeMode
				? <TreeCanvas config={ config } onConfigChange={ onConfigChange } />
				: <EnableTreeMode onEnable={ enableTreeMode } />
			}
		</div>
	);
}
