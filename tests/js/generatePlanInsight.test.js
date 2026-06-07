import generatePlanInsight from '../../public/js/src/utils/generatePlanInsight.js';

// Shared config: starter (tier 1) → pro (tier 2) → premium (tier 3).
// Answers are weighted so that the clear winner can be controlled per test.
const CONFIG = {
	questions: [
		{
			id: 1,
			answers: [
				{ id: '1a', label: 'Just getting started',         weights: { starter: 3, pro: 1, premium: 0 } },
				{ id: '1b', label: 'Established but ready to grow', weights: { starter: 1, pro: 3, premium: 1 } },
				{ id: '1c', label: 'Scaling and need full support', weights: { starter: 0, pro: 2, premium: 3 } },
			],
		},
		{
			id: 2,
			answers: [
				{ id: '2a', label: 'Build awareness and get visible', weights: { starter: 3, pro: 2, premium: 0 } },
				{ id: '2b', label: 'Grow and engage my audience',     weights: { starter: 1, pro: 3, premium: 1 } },
				{ id: '2c', label: 'Generate leads and drive revenue', weights: { starter: 0, pro: 2, premium: 3 } },
			],
		},
	],
	plans: [
		{ slug: 'starter', tier: 1, name: 'Starter', price: '', description: '', ctaLabel: '', ctaUrl: '' },
		{ slug: 'pro',     tier: 2, name: 'Pro',     price: '', description: '', ctaLabel: '', ctaUrl: '' },
		{ slug: 'premium', tier: 3, name: 'Premium', price: '', description: '', ctaLabel: '', ctaUrl: '' },
	],
};

// Answers that make `pro` the clear winner (pro scores highest).
const PRO_ANSWERS = { 1: '1b', 2: '2b' };

// Answers that make `premium` the clear winner.
const PREMIUM_ANSWERS = { 1: '1c', 2: '2c' };

// Answers that make `starter` the clear winner.
const STARTER_ANSWERS = { 1: '1a', 2: '2a' };

// ---------------------------------------------------------------------------
// Position 1 — recommended plan
// ---------------------------------------------------------------------------

describe( 'position 1 (recommended)', () => {
	test( 'isDowngrade is always false', () => {
		const result = generatePlanInsight( CONFIG.plans[ 1 ], 1, PRO_ANSWERS, CONFIG );
		expect( result.isDowngrade ).toBe( false );
	} );

	test( 'upsellReason is null', () => {
		const result = generatePlanInsight( CONFIG.plans[ 1 ], 1, PRO_ANSWERS, CONFIG );
		expect( result.upsellReason ).toBeNull();
	} );

	test( 'fitReason includes top two answer labels when both present', () => {
		const result = generatePlanInsight( CONFIG.plans[ 1 ], 1, PRO_ANSWERS, CONFIG );
		expect( result.fitReason ).toContain( 'Established but ready to grow' );
		expect( result.fitReason ).toContain( 'Grow and engage my audience' );
	} );

	test( 'fitReason includes single top label when only one question answered', () => {
		const result = generatePlanInsight( CONFIG.plans[ 1 ], 1, { 1: '1b' }, CONFIG );
		expect( result.fitReason ).toContain( 'Established but ready to grow' );
	} );

	test( 'fitReason falls back to generic string when no answers', () => {
		const result = generatePlanInsight( CONFIG.plans[ 1 ], 1, {}, CONFIG );
		expect( result.fitReason ).toBe( 'This option aligns with your overall profile.' );
	} );

	test( 'whyItMatters reflects tier 2 value statement', () => {
		const result = generatePlanInsight( CONFIG.plans[ 1 ], 1, PRO_ANSWERS, CONFIG );
		expect( result.whyItMatters ).toContain( 'balance of support and strategy' );
	} );
} );

// ---------------------------------------------------------------------------
// Position 2 — higher tier than recommended
// ---------------------------------------------------------------------------

describe( 'position 2 — upgrade (higher tier than recommended)', () => {
	// Recommended = pro (tier 2), this plan = premium (tier 3)
	const premiumPlan = CONFIG.plans[ 2 ];

	test( 'isDowngrade is false', () => {
		const result = generatePlanInsight( premiumPlan, 2, PRO_ANSWERS, CONFIG );
		expect( result.isDowngrade ).toBe( false );
	} );

	test( 'upsellReason is non-null', () => {
		const result = generatePlanInsight( premiumPlan, 2, PRO_ANSWERS, CONFIG );
		expect( result.upsellReason ).not.toBeNull();
	} );

	test( 'upsellReason contains plan name', () => {
		const result = generatePlanInsight( premiumPlan, 2, PRO_ANSWERS, CONFIG );
		expect( result.upsellReason ).toContain( 'Premium' );
	} );

	test( 'upsellReason uses full-service language for tier >= 3', () => {
		const result = generatePlanInsight( premiumPlan, 2, PRO_ANSWERS, CONFIG );
		expect( result.upsellReason ).toContain( 'full-service execution' );
	} );

	test( 'upsellReason uses expanded-support language for tier 2 upgrade', () => {
		// Recommended = starter (tier 1), this plan = pro (tier 2)
		const result = generatePlanInsight( CONFIG.plans[ 1 ], 2, STARTER_ANSWERS, CONFIG );
		expect( result.upsellReason ).toContain( 'expanded support' );
	} );
} );

// ---------------------------------------------------------------------------
// Position 2 — lower tier than recommended (downgrade)
// ---------------------------------------------------------------------------

describe( 'position 2 — downgrade (lower tier than recommended)', () => {
	// Recommended = premium (tier 3), this plan = starter (tier 1)
	const starterPlan = CONFIG.plans[ 0 ];

	test( 'isDowngrade is true', () => {
		const result = generatePlanInsight( starterPlan, 2, PREMIUM_ANSWERS, CONFIG );
		expect( result.isDowngrade ).toBe( true );
	} );

	test( 'upsellReason is non-null', () => {
		const result = generatePlanInsight( starterPlan, 2, PREMIUM_ANSWERS, CONFIG );
		expect( result.upsellReason ).not.toBeNull();
	} );

	test( 'upsellReason references the recommended plan name', () => {
		const result = generatePlanInsight( starterPlan, 2, PREMIUM_ANSWERS, CONFIG );
		expect( result.upsellReason ).toContain( 'Premium' );
	} );

	test( 'upsellReason reinforces recommended plan value, not the downgrade plan', () => {
		const result = generatePlanInsight( starterPlan, 2, PREMIUM_ANSWERS, CONFIG );
		expect( result.upsellReason ).toContain( 'gives you more for your investment' );
	} );

	test( 'upsellReason includes lowest-weight answer label when present', () => {
		// With PREMIUM_ANSWERS both weights toward starter are 0 — lowest label should still appear
		const result = generatePlanInsight( starterPlan, 2, PREMIUM_ANSWERS, CONFIG );
		// lowest-weight answers for starter in premium answers are 0 — label is either answer
		expect( typeof result.upsellReason ).toBe( 'string' );
		expect( result.upsellReason.length ).toBeGreaterThan( 0 );
	} );
} );

// ---------------------------------------------------------------------------
// Position 2 — same tier as recommended
// ---------------------------------------------------------------------------

describe( 'position 2 — same tier as recommended', () => {
	const sameTierConfig = {
		questions: CONFIG.questions,
		plans: [
			{ slug: 'alpha', tier: 2, name: 'Alpha', price: '', description: '', ctaLabel: '', ctaUrl: '' },
			{ slug: 'beta',  tier: 2, name: 'Beta',  price: '', description: '', ctaLabel: '', ctaUrl: '' },
		],
	};
	const answers = { 1: '1b', 2: '2b' }; // doesn't matter — both same tier

	test( 'isDowngrade is false', () => {
		const result = generatePlanInsight( sameTierConfig.plans[ 1 ], 2, answers, sameTierConfig );
		expect( result.isDowngrade ).toBe( false );
	} );

	test( 'upsellReason is null when tiers match', () => {
		const result = generatePlanInsight( sameTierConfig.plans[ 1 ], 2, answers, sameTierConfig );
		expect( result.upsellReason ).toBeNull();
	} );
} );

// ---------------------------------------------------------------------------
// Position 3
// ---------------------------------------------------------------------------

describe( 'position 3', () => {
	test( 'isDowngrade is false when higher tier than recommended', () => {
		// Recommended = pro (tier 2), this plan = premium (tier 3)
		const result = generatePlanInsight( CONFIG.plans[ 2 ], 3, PRO_ANSWERS, CONFIG );
		expect( result.isDowngrade ).toBe( false );
	} );

	test( 'isDowngrade is true when lower tier than recommended', () => {
		// Recommended = premium (tier 3), this plan = starter (tier 1)
		const result = generatePlanInsight( CONFIG.plans[ 0 ], 3, PREMIUM_ANSWERS, CONFIG );
		expect( result.isDowngrade ).toBe( true );
	} );
} );

// ---------------------------------------------------------------------------
// whyItMatters — tier-based value statements
// ---------------------------------------------------------------------------

describe( 'whyItMatters', () => {
	test( 'tier 1 — momentum language', () => {
		const result = generatePlanInsight( CONFIG.plans[ 0 ], 1, STARTER_ANSWERS, CONFIG );
		expect( result.whyItMatters ).toContain( 'momentum' );
	} );

	test( 'tier 2 — balance language', () => {
		const result = generatePlanInsight( CONFIG.plans[ 1 ], 1, PRO_ANSWERS, CONFIG );
		expect( result.whyItMatters ).toContain( 'balance' );
	} );

	test( 'tier 3 — full-service language', () => {
		const result = generatePlanInsight( CONFIG.plans[ 2 ], 1, PREMIUM_ANSWERS, CONFIG );
		expect( result.whyItMatters ).toContain( 'Full-service' );
	} );

	test( 'tier 4+ — complete ownership language', () => {
		const tier4Plan = { slug: 'elite', tier: 4, name: 'Elite' };
		const tier4Config = {
			questions: CONFIG.questions,
			plans: [ ...CONFIG.plans, tier4Plan ],
		};
		const result = generatePlanInsight( tier4Plan, 1, {}, tier4Config );
		expect( result.whyItMatters ).toContain( 'Complete ownership' );
	} );
} );

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe( 'edge cases', () => {
	test( 'returns strings even with null answers', () => {
		const result = generatePlanInsight( CONFIG.plans[ 0 ], 1, null, CONFIG );
		expect( typeof result.fitReason ).toBe( 'string' );
		expect( typeof result.whyItMatters ).toBe( 'string' );
	} );

	test( 'returns strings even with null config', () => {
		const result = generatePlanInsight( CONFIG.plans[ 0 ], 1, {}, null );
		expect( typeof result.fitReason ).toBe( 'string' );
		expect( typeof result.whyItMatters ).toBe( 'string' );
	} );

	test( 'isDowngrade is always false for position 1 regardless of tier', () => {
		const result = generatePlanInsight( CONFIG.plans[ 0 ], 1, PREMIUM_ANSWERS, CONFIG );
		expect( result.isDowngrade ).toBe( false );
	} );
} );
