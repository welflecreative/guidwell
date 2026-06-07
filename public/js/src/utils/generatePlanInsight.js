import { __ } from '@wordpress/i18n';
import { getTopPlans } from './scoreAnswers';

/**
 * Generates per-plan copy for the result display.
 *
 * Returns:
 *  - fitReason    — why this plan suits the user's answers
 *  - upsellReason — upgrade nudge (higher tier) or downgrade warning (lower tier)
 *  - whyItMatters — tier-based value statement (shown on hero panel only)
 *  - isDowngrade  — true when this plan is a lower tier than the recommended plan
 *
 * @param {Object} plan           Plan object (with .slug, .tier, .name)
 * @param {1|2|3}  podiumPosition 1 = recommended, 2 = second, 3 = third
 * @param {Object} answers        { [questionId]: answerId }
 * @param {Object} config         { questions, plans }
 * @returns {{ fitReason: string, upsellReason: string|null, whyItMatters: string, isDowngrade: boolean }}
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

	// Tier diff vs. the position-1 (recommended) plan.
	const recommendedPlan = podiumPosition > 1 ? getTopPlans( answers, config, 1 )[ 0 ] : null;
	const tierDiff        = recommendedPlan ? ( plan.tier ?? 1 ) - ( recommendedPlan.tier ?? 1 ) : 0;
	const isDowngrade     = podiumPosition > 1 && tierDiff < 0;

	// ── fitReason ─────────────────────────────────────────────────────────────

	const genericFit = __( 'This option aligns with your overall profile.', 'guidwell' );
	let fitReason;

	if ( podiumPosition === 1 ) {
		if ( top1 && top2 ) {
			fitReason = `${ __( 'Your answers — particularly', 'guidwell' ) } "${ top1 }" ${ __( 'and', 'guidwell' ) } "${ top2 }" — ${ __( 'point strongly toward this option.', 'guidwell' ) }`;
		} else if ( top1 ) {
			fitReason = `${ __( 'Your answers — particularly', 'guidwell' ) } "${ top1 }" — ${ __( 'point strongly toward this option.', 'guidwell' ) }`;
		} else {
			fitReason = genericFit;
		}
	} else if ( podiumPosition === 2 ) {
		fitReason = top1
			? `${ __( 'Your answers also align with this option — especially your choice of', 'guidwell' ) } "${ top1 }."`
			: genericFit;
	} else {
		fitReason = top1
			? `${ __( 'Elements of your answers — including', 'guidwell' ) } "${ top1 }" — ${ __( 'are reflected in this option too.', 'guidwell' ) }`
			: genericFit;
	}

	// ── upsellReason ──────────────────────────────────────────────────────────

	let upsellReason = null;

	if ( podiumPosition > 1 ) {
		const recName = recommendedPlan?.name || __( 'the recommended plan', 'guidwell' );

		if ( tierDiff > 0 ) {
			// Higher tier — upgrade nudge toward this plan.
			const upgradeValue = ( plan.tier ?? 1 ) >= 3
				? __( 'full-service execution and dedicated strategy', 'guidwell' )
				: __( 'expanded support and deeper collaboration', 'guidwell' );
			upsellReason = `${ __( 'If your needs grow, stepping up to', 'guidwell' ) } ${ plan.name } ${ __( 'unlocks', 'guidwell' ) } ${ upgradeValue }.`;
		} else if ( tierDiff < 0 ) {
			// Lower tier — reinforce the recommended plan's value; warn what they'd lose.
			upsellReason = `${ recName } ${ __( 'gives you more for your investment. Choosing this option means giving up meaningful support — worth factoring in before deciding.', 'guidwell' ) }`;
		}
		// tierDiff === 0: leave null — same tier, no direction to push
	}

	// ── whyItMatters (shown on hero panel only) ───────────────────────────────

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

	return { fitReason, upsellReason, whyItMatters, isDowngrade };
}
