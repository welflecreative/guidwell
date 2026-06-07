import scoreAnswers from './scoreAnswers';

/**
 * Identifies the 2 most "decisive" answers (highest positive delta toward
 * the recommended plan) and returns a warm insight string.
 *
 * @param {{ [questionId: string|number]: string }} answers
 * @param {{ questions: Array, plans: Array }} config
 * @returns {string}
 */
export default function generateInsight( answers, config ) {
	const { questions = [], plans = [] } = config;

	const recommendedSlug = scoreAnswers( answers, config );
	if ( ! recommendedSlug ) return '';

	const otherSlugs = plans.map( ( p ) => p.slug ).filter( ( s ) => s !== recommendedSlug );

	const deltas = [];

	questions.forEach( ( question ) => {
		const selectedId = answers[ question.id ];
		if ( ! selectedId ) return;

		const answer = question.answers.find( ( a ) => a.id === selectedId );
		if ( ! answer ) return;

		const recommendedWeight = answer.weights[ recommendedSlug ] ?? 0;
		const otherWeights      = otherSlugs.map( ( s ) => answer.weights[ s ] ?? 0 );
		const avgOther          = otherWeights.length > 0
			? otherWeights.reduce( ( sum, w ) => sum + w, 0 ) / otherWeights.length
			: 0;

		deltas.push( { label: answer.label, delta: recommendedWeight - avgOther } );
	} );

	const top = deltas.sort( ( a, b ) => b.delta - a.delta ).slice( 0, 2 );

	if ( top.length === 0 ) return '';

	if ( top.length === 1 ) {
		return `Based on your answers — particularly "${ top[ 0 ].label }" — this looks like your strongest fit.`;
	}

	return `Based on your answers — particularly "${ top[ 0 ].label }" and "${ top[ 1 ].label }" — this looks like your strongest fit.`;
}
