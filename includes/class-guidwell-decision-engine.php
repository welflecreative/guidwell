<?php

defined( 'ABSPATH' ) || exit;

class Guidwell_Decision_Engine {

	/**
	 * Returns the slug of the highest-scoring plan.
	 * Tie-breaking: lowest tier value wins.
	 *
	 * @param array<int|string, string> $answers  { question_id => answer_id }
	 * @param array<string, mixed>      $config   Full config array with 'questions' and 'plans' keys.
	 * @return string
	 */
	public function calculate( array $answers, array $config ): string {
		$scores = $this->get_scores( $answers, $config );
		$plans  = $config['plans'] ?? [];

		$best_slug  = '';
		$best_score = -1;
		$best_tier  = PHP_INT_MAX;

		foreach ( $plans as $plan ) {
			$slug  = $plan['slug'] ?? '';
			$tier  = $plan['tier'] ?? PHP_INT_MAX;
			$score = $scores[ $slug ] ?? 0;

			if ( $score > $best_score || ( $score === $best_score && $tier < $best_tier ) ) {
				$best_score = $score;
				$best_tier  = $tier;
				$best_slug  = $slug;
			}
		}

		return $best_slug;
	}

	/**
	 * Returns the full score breakdown for all plans.
	 *
	 * @param array<int|string, string> $answers
	 * @param array<string, mixed>      $config
	 * @return array<string, int>  { slug => score }
	 */
	public function get_scores( array $answers, array $config ): array {
		$questions = $config['questions'] ?? [];
		$plans     = $config['plans'] ?? [];

		$scores = [];
		foreach ( $plans as $plan ) {
			$scores[ $plan['slug'] ] = 0;
		}

		foreach ( $questions as $question ) {
			$question_id = $question['id'];

			if ( ! isset( $answers[ $question_id ] ) ) {
				continue;
			}

			$selected_answer_id = $answers[ $question_id ];

			foreach ( $question['answers'] as $answer ) {
				if ( $answer['id'] !== $selected_answer_id ) {
					continue;
				}

				foreach ( $answer['weights'] as $slug => $weight ) {
					if ( isset( $scores[ $slug ] ) ) {
						$scores[ $slug ] += (int) $weight;
					}
				}
			}
		}

		return $scores;
	}
}
