/**
 * Shared score computation used by all exported functions.
 * Returns a plain { slug: totalScore } map.
 */
function computeScores( answers, config ) {
	const { questions = [], plans = [] } = config;
	const scores = {};
	plans.forEach( ( plan ) => { scores[ plan.slug ] = 0; } );

	questions.forEach( ( question ) => {
		if ( question.type === 'text' ) return;
		const selectedId = answers[ question.id ];
		if ( ! selectedId ) return;

		const ids = question.multiSelect && Array.isArray( selectedId ) ? selectedId : [ selectedId ];
		ids.forEach( ( id ) => {
			const answer = question.answers.find( ( a ) => a.id === id );
			if ( ! answer ) return;
			Object.entries( answer.weights ).forEach( ( [ slug, weight ] ) => {
				if ( slug in scores ) scores[ slug ] += weight;
			} );
		} );
	} );

	return scores;
}

/**
 * Returns plans sorted by score descending, ties broken by lowest tier.
 */
function sortedByScore( plans, scores ) {
	return [ ...plans ].sort( ( a, b ) => {
		const diff = ( scores[ b.slug ] ?? 0 ) - ( scores[ a.slug ] ?? 0 );
		if ( diff !== 0 ) return diff;
		return ( a.tier ?? Infinity ) - ( b.tier ?? Infinity );
	} );
}

/**
 * Returns the slug of the highest-scoring plan.
 * Mirrors Guidwell_Decision_Engine::calculate() exactly.
 *
 * @param {{ [questionId: string|number]: string }} answers
 * @param {{ questions: Array, plans: Array }} config
 * @returns {string}
 */
export default function scoreAnswers( answers, config ) {
	const { plans = [] } = config;
	const scores = computeScores( answers, config );
	const sorted = sortedByScore( plans, scores );
	return sorted.length > 0 ? sorted[ 0 ].slug : '';
}

/**
 * Returns up to `count` plan objects sorted by score descending, each
 * augmented with its numeric score.
 *
 * @param {{ [questionId: string|number]: string }} answers
 * @param {{ questions: Array, plans: Array }} config
 * @param {number} count
 * @returns {Array<{ score: number } & Object>}
 */
export function getTopPlans( answers, config, count = 3 ) {
	const { plans = [] } = config;
	const scores = computeScores( answers, config );
	return sortedByScore( plans, scores )
		.slice( 0, count )
		.map( ( plan ) => ( { ...plan, score: scores[ plan.slug ] ?? 0 } ) );
}

/**
 * Returns ALL plans sorted by score descending, each augmented with
 * `score` and `percentageOfMax` (used for score bar visualization).
 *
 * @param {{ [questionId: string|number]: string }} answers
 * @param {{ questions: Array, plans: Array }} config
 * @returns {Array<{ score: number, percentageOfMax: number } & Object>}
 */
export function getAllScores( answers, config ) {
	const { plans = [] } = config;
	const scores  = computeScores( answers, config );
	const sorted  = sortedByScore( plans, scores );
	const highest = sorted.length > 0 ? ( scores[ sorted[ 0 ].slug ] ?? 0 ) : 0;

	return sorted.map( ( plan ) => {
		const score = scores[ plan.slug ] ?? 0;
		return {
			...plan,
			score,
			percentageOfMax: highest > 0 ? ( score / highest ) * 100 : 0,
		};
	} );
}
