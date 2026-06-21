import { __ } from '@wordpress/i18n';
import AnswerCard from './AnswerCard';
import NavigationButtons from './NavigationButtons';

export default function QuestionStep( {
	question,
	selectedAnswer,
	onSelect,
	onNext,
	onBack,
	canGoBack,
	isLastStep,
	headingRef,
} ) {
	const isText = question.type === 'text';

	return (
		<div className="guidwell-question">
			<h2
				className="guidwell-question-text"
				ref={ headingRef }
				tabIndex={ -1 }
			>
				{ question.text }
			</h2>
			{ isText ? (
				<div className="guidwell-text-answer">
					<textarea
						className="guidwell-text-answer__input"
						value={ selectedAnswer || '' }
						onChange={ ( e ) => onSelect( e.target.value ) }
						placeholder={ __( 'Your answer… (optional)', 'guidwell' ) }
						rows={ 4 }
					/>
				</div>
			) : (
				<div className="guidwell-answers">
					{ question.answers.map( ( answer ) => (
						<AnswerCard
							key={ answer.id }
							answer={ answer }
							isSelected={ selectedAnswer === answer.id }
							onSelect={ onSelect }
						/>
					) ) }
				</div>
			) }
			<NavigationButtons
				onNext={ onNext }
				onBack={ onBack }
				canGoBack={ canGoBack }
				isLastStep={ isLastStep }
				hasSelection={ isText ? true : !! selectedAnswer }
			/>
		</div>
	);
}
