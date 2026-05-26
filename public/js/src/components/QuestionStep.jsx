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
	return (
		<div className="guidwell-question">
			<h2
				className="guidwell-question-text"
				ref={ headingRef }
				tabIndex={ -1 }
			>
				{ question.text }
			</h2>
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
			<NavigationButtons
				onNext={ onNext }
				onBack={ onBack }
				canGoBack={ canGoBack }
				isLastStep={ isLastStep }
				hasSelection={ !! selectedAnswer }
			/>
		</div>
	);
}
