<?php

use PHPUnit\Framework\TestCase;

class DecisionEngineTest extends TestCase {

	private Guidwell_Decision_Engine $engine;

	protected function setUp(): void {
		$this->engine = new Guidwell_Decision_Engine();
	}

	// ---------------------------------------------------------------------------
	// Fixture
	// ---------------------------------------------------------------------------

	private static function config(): array {
		return [
			'questions' => [
				[
					'id'      => 1,
					'answers' => [
						[ 'id' => '1a', 'weights' => [ 'starter' => 3, 'pro' => 1, 'premium' => 0 ] ],
						[ 'id' => '1b', 'weights' => [ 'starter' => 1, 'pro' => 3, 'premium' => 1 ] ],
						[ 'id' => '1c', 'weights' => [ 'starter' => 0, 'pro' => 2, 'premium' => 3 ] ],
					],
				],
				[
					'id'      => 2,
					'answers' => [
						[ 'id' => '2a', 'weights' => [ 'starter' => 3, 'pro' => 2, 'premium' => 0 ] ],
						[ 'id' => '2b', 'weights' => [ 'starter' => 1, 'pro' => 3, 'premium' => 1 ] ],
						[ 'id' => '2c', 'weights' => [ 'starter' => 0, 'pro' => 2, 'premium' => 3 ] ],
					],
				],
			],
			'plans' => [
				[ 'slug' => 'starter', 'tier' => 1, 'name' => 'Starter', 'price' => '', 'description' => '', 'ctaLabel' => '', 'ctaUrl' => '' ],
				[ 'slug' => 'pro',     'tier' => 2, 'name' => 'Pro',     'price' => '', 'description' => '', 'ctaLabel' => '', 'ctaUrl' => '' ],
				[ 'slug' => 'premium', 'tier' => 3, 'name' => 'Premium', 'price' => '', 'description' => '', 'ctaLabel' => '', 'ctaUrl' => '' ],
			],
		];
	}

	// ---------------------------------------------------------------------------
	// calculate()
	// ---------------------------------------------------------------------------

	public function test_calculate_returns_starter_for_starter_answers(): void {
		$this->assertSame( 'starter', $this->engine->calculate( [ 1 => '1a', 2 => '2a' ], self::config() ) );
	}

	public function test_calculate_returns_pro_for_pro_answers(): void {
		$this->assertSame( 'pro', $this->engine->calculate( [ 1 => '1b', 2 => '2b' ], self::config() ) );
	}

	public function test_calculate_returns_premium_for_premium_answers(): void {
		$this->assertSame( 'premium', $this->engine->calculate( [ 1 => '1c', 2 => '2c' ], self::config() ) );
	}

	public function test_calculate_empty_answers_returns_lowest_tier_plan(): void {
		// All scores zero — lowest tier (starter, tier=1) wins.
		$this->assertSame( 'starter', $this->engine->calculate( [], self::config() ) );
	}

	public function test_calculate_ignores_unknown_answer_id(): void {
		// Q1 has an unrecognised answer, Q2 clearly points to premium.
		$this->assertSame( 'premium', $this->engine->calculate( [ 1 => 'BOGUS', 2 => '2c' ], self::config() ) );
	}

	public function test_calculate_tiebreak_returns_lower_tier(): void {
		$config = [
			'questions' => [
				[
					'id'      => 1,
					'answers' => [
						[ 'id' => '1a', 'weights' => [ 'alpha' => 5, 'beta' => 5 ] ],
					],
				],
			],
			'plans' => [
				[ 'slug' => 'alpha', 'tier' => 2, 'name' => 'Alpha', 'price' => '', 'description' => '', 'ctaLabel' => '', 'ctaUrl' => '' ],
				[ 'slug' => 'beta',  'tier' => 1, 'name' => 'Beta',  'price' => '', 'description' => '', 'ctaLabel' => '', 'ctaUrl' => '' ],
			],
		];

		// Both score 5 — beta (tier 1) must win.
		$this->assertSame( 'beta', $this->engine->calculate( [ 1 => '1a' ], $config ) );
	}

	public function test_calculate_mixed_answers_picks_correct_plan(): void {
		// Q1 → pro (1b), Q2 → starter (2a): pro gets 3+2=5, starter gets 1+3=4 → pro wins.
		$this->assertSame( 'pro', $this->engine->calculate( [ 1 => '1b', 2 => '2a' ], self::config() ) );
	}

	// ---------------------------------------------------------------------------
	// get_scores()
	// ---------------------------------------------------------------------------

	public function test_get_scores_returns_correct_breakdown(): void {
		// '1a' → starter+3, pro+1, premium+0
		// '2a' → starter+3, pro+2, premium+0
		$scores = $this->engine->get_scores( [ 1 => '1a', 2 => '2a' ], self::config() );

		$this->assertSame( 6, $scores['starter'] );
		$this->assertSame( 3, $scores['pro'] );
		$this->assertSame( 0, $scores['premium'] );
	}

	public function test_get_scores_returns_all_zeros_for_empty_answers(): void {
		$scores = $this->engine->get_scores( [], self::config() );

		foreach ( $scores as $score ) {
			$this->assertSame( 0, $score );
		}
	}

	public function test_get_scores_skips_unanswered_questions(): void {
		// Only Q1 answered with '1a' → starter+3, pro+1, premium+0. Q2 contributes nothing.
		$scores = $this->engine->get_scores( [ 1 => '1a' ], self::config() );

		$this->assertSame( 3, $scores['starter'] );
		$this->assertSame( 1, $scores['pro'] );
		$this->assertSame( 0, $scores['premium'] );
	}

	public function test_get_scores_returns_slug_keys_for_all_plans(): void {
		$scores = $this->engine->get_scores( [], self::config() );

		$this->assertArrayHasKey( 'starter', $scores );
		$this->assertArrayHasKey( 'pro',     $scores );
		$this->assertArrayHasKey( 'premium', $scores );
	}
}
