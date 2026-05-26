/**
 * Returns the slug of the highest-scoring plan.
 * Mirrors Guidwell_Decision_Engine::calculate() exactly.
 * Tie-breaking: lowest tier value wins.
 *
 * @param {{ [questionId: string|number]: string }} answers
 * @param {{ questions: Array, plans: Array }} config
 * @returns {string}
 */
export default function scoreAnswers( answers, config ) {
	const { questions = [], plans = [] } = config;

	const scores = {};
	plans.forEach( ( plan ) => { scores[ plan.slug ] = 0; } );

	questions.forEach( ( question ) => {
		const selectedId = answers[ question.id ];
		if ( ! selectedId ) return;

		const answer = question.answers.find( ( a ) => a.id === selectedId );
		if ( ! answer ) return;

		Object.entries( answer.weights ).forEach( ( [ slug, weight ] ) => {
			if ( slug in scores ) scores[ slug ] += weight;
		} );
	} );

	let bestSlug  = '';
	let bestScore = -1;
	let bestTier  = Infinity;

	plans.forEach( ( plan ) => {
		const score = scores[ plan.slug ] ?? 0;
		const tier  = plan.tier ?? Infinity;

		if ( score > bestScore || ( score === bestScore && tier < bestTier ) ) {
			bestScore = score;
			bestTier  = tier;
			bestSlug  = plan.slug;
		}
	} );

	return bestSlug;
}
