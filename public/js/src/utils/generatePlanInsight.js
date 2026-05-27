import { __ } from '@wordpress/i18n';
import { getTopPlans } from './scoreAnswers';

/**
 * Generates per-plan copy for the podium result display.
 *
 * @param {Object} plan           Plan object (with .slug, .tier, .name)
 * @param {1|2|3}  podiumPosition 1 = recommended, 2 = second, 3 = third
 * @param {Object} answers        { [questionId]: answerId }
 * @param {Object} config         { questions, plans }
 * @returns {{ fitReason: string, upsellReason: string|null, whyItMatters: string }}
 */
export default function generatePlanInsight( plan, podiumPosition, answers, config ) {
	const { questions = [] } = config || {};
	const slug = plan?.slug;

	// Collect answered questions with their weight toward this plan
	const answered = [];
	questions.forEach( ( q ) => {
		const selectedId = answers?.[ q.id ];
		if ( ! selectedId ) return;
		const answer = q.answers?.find( ( a ) => a.id === selectedId );
		if ( ! answer ) return;
		const weight = answer.weights?.[ slug ] ?? 0;
		answered.push( { label: answer.label, weight } );
	} );

	const byDesc = [ ...answered ].sort( ( a, b ) => b.weight - a.weight );
	const top1   = byDesc[ 0 ]?.label;
	const top2   = byDesc[ 1 ]?.label;
	const byAsc  = [ ...answered ].sort( ( a, b ) => a.weight - b.weight );
	const lowest = byAsc[ 0 ]?.label;

	// ── fitReason ─────────────────────────────────────────────────────────────

	const genericFit = __( 'This option aligns with your overall profile.', 'guidwell' );
	let fitReason;

	if ( podiumPosition === 1 ) {
		if ( top1 && top2 ) {
			fitReason = `${ __( 'Your answers — particularly', 'guidwell' ) } ${ top1 } ${ __( 'and', 'guidwell' ) } ${ top2 } — ${ __( 'point strongly toward this option.', 'guidwell' ) }`;
		} else if ( top1 ) {
			fitReason = `${ __( 'Your answers — particularly', 'guidwell' ) } ${ top1 } — ${ __( 'point strongly toward this option.', 'guidwell' ) }`;
		} else {
			fitReason = genericFit;
		}
	} else if ( podiumPosition === 2 ) {
		fitReason = top1
			? `${ __( 'Your answers also align with this option, especially', 'guidwell' ) } ${ top1 }.`
			: genericFit;
	} else {
		fitReason = top1
			? `${ __( 'Elements of your answers, including', 'guidwell' ) } ${ top1 }, ${ __( 'are reflected in this option too.', 'guidwell' ) }`
			: genericFit;
	}

	// ── upsellReason ──────────────────────────────────────────────────────────

	let upsellReason = null;

	if ( podiumPosition === 2 ) {
		const topPlan = getTopPlans( answers, config, 1 )[ 0 ];
		const tierDiff = topPlan ? ( plan.tier ?? 1 ) - ( topPlan.tier ?? 1 ) : 0;

		if ( tierDiff > 0 ) {
			const diff = ( plan.tier ?? 1 ) >= 3
				? __( 'full-service execution and dedicated strategy', 'guidwell' )
				: __( 'expanded support and deeper collaboration', 'guidwell' );
			upsellReason = `${ __( 'Stepping up to', 'guidwell' ) } ${ plan.name } ${ __( 'means', 'guidwell' ) } ${ diff } — ${ __( 'worth considering if your needs grow.', 'guidwell' ) }`;
		} else if ( tierDiff < 0 ) {
			upsellReason = lowest
				? `${ __( 'This lighter option could work well if', 'guidwell' ) } ${ lowest } ${ __( 'is your main consideration.', 'guidwell' ) }`
				: __( 'Stepping up unlocks more comprehensive support.', 'guidwell' );
		}
		// tierDiff === 0: leave null
	} else if ( podiumPosition === 3 ) {
		upsellReason = `${ plan.name } ${ __( 'is the full-service option — if you want everything handled end-to-end, this is it.', 'guidwell' ) }`;
	}

	// ── whyItMatters (tier-based) ─────────────────────────────────────────────

	const tier = plan?.tier ?? 1;
	let whyItMatters;

	if ( tier === 1 ) {
		whyItMatters = __( 'A focused starting point that builds momentum without overcommitting.', 'guidwell' );
	} else if ( tier === 2 ) {
		whyItMatters = __( 'The right balance of support and strategy for consistent growth.', 'guidwell' );
	} else if ( tier === 3 ) {
		whyItMatters = __( 'Full-service execution so you can focus on running your business.', 'guidwell' );
	} else {
		whyItMatters = __( 'Complete ownership of your marketing — from strategy to daily execution.', 'guidwell' );
	}

	return { fitReason, upsellReason, whyItMatters };
}
