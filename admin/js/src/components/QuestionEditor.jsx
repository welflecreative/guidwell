import { useEffect, useRef, useCallback } from 'react';
import { __ } from '@wordpress/i18n';
import Sortable from 'sortablejs';

function AutoResizeTextarea( { value, onChange, className, ...props } ) {
	const ref = useRef( null );

	useEffect( () => {
		if ( ref.current ) {
			ref.current.style.height = 'auto';
			ref.current.style.height = `${ ref.current.scrollHeight }px`;
		}
	}, [ value ] );

	return (
		<textarea
			ref={ ref }
			value={ value }
			onChange={ onChange }
			className={ `gw-textarea ${ className || '' }` }
			{ ...props }
		/>
	);
}

export default function QuestionEditor( { question, plans, onUpdate } ) {
	const isTextQuestion = question.type === 'text';

	const answersListRef = useRef( null );
	const answersRef     = useRef( question.answers );
	useEffect( () => { answersRef.current = question.answers; }, [ question.answers ] );

	function setQuestionType( type ) {
		if ( type === 'text' ) {
			onUpdate( { ...question, type: 'text', answers: [] } );
		} else {
			const { type: _t, ...rest } = question;
			const answers = rest.answers?.length
				? rest.answers
				: [ { id: `a_${ Date.now() }`, label: '', weights: Object.fromEntries( plans.map( ( p ) => [ p.slug, 0 ] ) ) } ];
			onUpdate( { ...rest, answers } );
		}
	}

	// Sortable for answer rows.
	useEffect( () => {
		if ( ! answersListRef.current ) return;

		const sortable = new Sortable( answersListRef.current, {
			animation: 150,
			handle:    '.gw-drag-handle',
			onEnd: ( evt ) => {
				if ( evt.oldIndex === evt.newIndex ) return;
				const updated = [ ...answersRef.current ];
				const [ moved ] = updated.splice( evt.oldIndex, 1 );
				updated.splice( evt.newIndex, 0, moved );
				onUpdate( { ...question, answers: updated } );
			},
		} );

		return () => sortable.destroy();
	}, [ isTextQuestion ] );

	function setQuestionText( text ) {
		onUpdate( { ...question, text } );
	}

	function setAnswerLabel( answerId, label ) {
		onUpdate( {
			...question,
			answers: question.answers.map( ( a ) =>
				a.id === answerId ? { ...a, label } : a
			),
		} );
	}

	function setAnswerWeight( answerId, planSlug, value ) {
		const weight = Math.max( 0, Math.min( plans.length, parseInt( value, 10 ) || 0 ) );
		onUpdate( {
			...question,
			answers: question.answers.map( ( a ) =>
				a.id === answerId ? { ...a, weights: { ...a.weights, [ planSlug ]: weight } } : a
			),
		} );
	}

	function addAnswer() {
		const newAnswer = {
			id:      `a_${ Date.now() }`,
			label:   '',
			weights: Object.fromEntries( plans.map( ( p ) => [ p.slug, 0 ] ) ),
		};
		onUpdate( { ...question, answers: [ ...question.answers, newAnswer ] } );
	}

	function deleteAnswer( answerId ) {
		onUpdate( { ...question, answers: question.answers.filter( ( a ) => a.id !== answerId ) } );
	}

	return (
		<div>
			<div className="gw-field">
				<label className="gw-label">{ __( 'Question Type', 'guidwell' ) }</label>
				<div className="gw-radio-group">
					<label className="gw-radio-option">
						<input
							type="radio"
							name={ `qtype_${ question.id }` }
							checked={ ! isTextQuestion }
							onChange={ () => setQuestionType( 'scored' ) }
						/>
						<span>{ __( 'Scored — answer choices affect plan recommendations', 'guidwell' ) }</span>
					</label>
					<label className="gw-radio-option">
						<input
							type="radio"
							name={ `qtype_${ question.id }` }
							checked={ isTextQuestion }
							onChange={ () => setQuestionType( 'text' ) }
						/>
						<span>{ __( 'Text response — free-form, sent to admin only (not scored)', 'guidwell' ) }</span>
					</label>
				</div>
			</div>

			{ ! isTextQuestion && (
				<div className="gw-field">
					<label className="gw-checkbox-option">
						<input
							type="checkbox"
							checked={ !! question.multiSelect }
							onChange={ ( e ) => onUpdate( { ...question, multiSelect: e.target.checked } ) }
						/>
						<span>{ __( 'Allow multiple selections — visitor can pick more than one answer', 'guidwell' ) }</span>
					</label>
				</div>
			) }

			<div className="gw-field">
				<label className="gw-label">{ __( 'Question', 'guidwell' ) }</label>
				<AutoResizeTextarea
					value={ question.text }
					onChange={ ( e ) => setQuestionText( e.target.value ) }
					placeholder={ __( 'Enter your question…', 'guidwell' ) }
					rows={ 2 }
				/>
			</div>

			{ isTextQuestion ? (
				<p className="gw-field-note gw-field-note--info">
					{ __( 'Visitors will see a text area for their answer. Their response won\'t affect scoring and won\'t appear on the results page — it will only show up in your admin notification email.', 'guidwell' ) }
				</p>
			) : (
				<>
			<div className="gw-section-header">
				<h3 className="gw-section-title">{ __( 'Answers', 'guidwell' ) }</h3>
				<button className="gw-btn-secondary" onClick={ addAnswer }>
					+ { __( 'Add Answer', 'guidwell' ) }
				</button>
			</div>

			<div className="gw-answers-list" ref={ answersListRef }>
				{ question.answers.map( ( answer ) => (
					<div key={ answer.id } className="gw-answer-row">
						<div className="gw-answer-row__top">
							<span className="gw-drag-handle" title={ __( 'Drag to reorder', 'guidwell' ) }>&#9776;</span>
							<input
								type="text"
								className={ `gw-input gw-answer-row__input` }
								value={ answer.label }
								onChange={ ( e ) => setAnswerLabel( answer.id, e.target.value ) }
								placeholder={ __( 'Answer text…', 'guidwell' ) }
							/>
							<button
								className="gw-answer-row__delete"
								onClick={ () => deleteAnswer( answer.id ) }
								aria-label={ __( 'Delete answer', 'guidwell' ) }
							>×</button>
						</div>

						<div className="gw-weights">
							{ plans.map( ( plan ) => (
								<div key={ plan.slug } className="gw-weight-field">
									<span className="gw-weight-label">{ plan.name || plan.slug }</span>
									<input
										type="number"
										className="gw-weight-input"
										min="0"
										max={ plans.length }
										value={ answer.weights[ plan.slug ] ?? 0 }
										onChange={ ( e ) => setAnswerWeight( answer.id, plan.slug, e.target.value ) }
									/>
								</div>
							) ) }
						</div>
					</div>
				) ) }
			</div>
				</>
			) }
		</div>
	);
}
