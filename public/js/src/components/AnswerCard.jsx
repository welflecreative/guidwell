export default function AnswerCard( { answer, isSelected, onSelect } ) {
	return (
		<button
			type="button"
			className={ `guidwell-answer-card${ isSelected ? ' guidwell-answer-card--selected' : '' }` }
			onClick={ () => onSelect( answer.id ) }
			aria-pressed={ isSelected }
		>
			<span className="guidwell-answer-label">{ answer.label }</span>
			{ isSelected && (
				<span className="guidwell-answer-check" aria-hidden="true">
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
						<circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
						<path
							d="M5.5 10.5L8.5 13.5L14.5 7.5"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</span>
			) }
		</button>
	);
}
