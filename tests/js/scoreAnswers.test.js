import scoreAnswers from '../../public/js/src/utils/scoreAnswers.js';

const CONFIG = {
	questions: [
		{
			id: 1,
			answers: [
				{ id: '1a', weights: { starter: 3, pro: 1, premium: 0 } },
				{ id: '1b', weights: { starter: 1, pro: 3, premium: 1 } },
				{ id: '1c', weights: { starter: 0, pro: 2, premium: 3 } },
			],
		},
		{
			id: 2,
			answers: [
				{ id: '2a', weights: { starter: 3, pro: 2, premium: 0 } },
				{ id: '2b', weights: { starter: 1, pro: 3, premium: 1 } },
				{ id: '2c', weights: { starter: 0, pro: 2, premium: 3 } },
			],
		},
	],
	plans: [
		{ slug: 'starter', tier: 1, name: 'Starter', price: '', description: '', ctaLabel: '', ctaUrl: '' },
		{ slug: 'pro',     tier: 2, name: 'Pro',     price: '', description: '', ctaLabel: '', ctaUrl: '' },
		{ slug: 'premium', tier: 3, name: 'Premium', price: '', description: '', ctaLabel: '', ctaUrl: '' },
	],
};

// ---------------------------------------------------------------------------
// Clear winners
// ---------------------------------------------------------------------------

test( 'returns starter for all-starter answers', () => {
	expect( scoreAnswers( { 1: '1a', 2: '2a' }, CONFIG ) ).toBe( 'starter' );
} );

test( 'returns pro for all-pro answers', () => {
	expect( scoreAnswers( { 1: '1b', 2: '2b' }, CONFIG ) ).toBe( 'pro' );
} );

test( 'returns premium for all-premium answers', () => {
	expect( scoreAnswers( { 1: '1c', 2: '2c' }, CONFIG ) ).toBe( 'premium' );
} );

// ---------------------------------------------------------------------------
// Mixed answers
// ---------------------------------------------------------------------------

test( 'returns pro when mixed answers favour pro', () => {
	// Q1 → pro (1b): pro+3, starter+1  |  Q2 → starter (2a): starter+3, pro+2
	// totals: starter=4, pro=5, premium=1  →  pro wins
	expect( scoreAnswers( { 1: '1b', 2: '2a' }, CONFIG ) ).toBe( 'pro' );
} );

// ---------------------------------------------------------------------------
// Tie-breaking
// ---------------------------------------------------------------------------

test( 'tie-break returns the plan with lower tier', () => {
	const config = {
		questions: [
			{
				id: 1,
				answers: [
					{ id: '1a', weights: { alpha: 5, beta: 5 } },
				],
			},
		],
		plans: [
			{ slug: 'alpha', tier: 2 },
			{ slug: 'beta',  tier: 1 },
		],
	};

	// Both score 5 — beta (tier 1) must win.
	expect( scoreAnswers( { 1: '1a' }, config ) ).toBe( 'beta' );
} );

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

test( 'empty answers returns lowest-tier plan', () => {
	// All scores are 0 — starter (tier 1) wins.
	expect( scoreAnswers( {}, CONFIG ) ).toBe( 'starter' );
} );

test( 'unknown answer id is silently ignored', () => {
	// Q1 bogus contributes 0, Q2 → premium clearly wins.
	expect( scoreAnswers( { 1: 'BOGUS', 2: '2c' }, CONFIG ) ).toBe( 'premium' );
} );

test( 'unanswered question contributes zero to all scores', () => {
	// Only Q2 answered with premium answer — premium should still win.
	expect( scoreAnswers( { 2: '2c' }, CONFIG ) ).toBe( 'premium' );
} );

test( 'returns empty string when config has no plans', () => {
	const empty = { questions: [], plans: [] };
	expect( scoreAnswers( {}, empty ) ).toBe( '' );
} );
