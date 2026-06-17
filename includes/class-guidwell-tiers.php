<?php

defined( 'ABSPATH' ) || exit;

/**
 * Single access point for tier/feature gating.
 *
 * All business logic reads from config/tiers.json — change the JSON,
 * nothing here needs to change.
 *
 * Usage:
 *   Guidwell_Tiers::can( 'email_capture' )        → bool
 *   Guidwell_Tiers::limit( 'questions_per_wizard' ) → int|null  (null = unlimited)
 *   Guidwell_Tiers::upgrade_message( 'csv_import' ) → string
 *   Guidwell_Tiers::current()                       → 'free'|'starter'|'pro'|'agency'
 */
class Guidwell_Tiers {

	private static ?array $config = null;

	// ── Config loader ─────────────────────────────────────────────────────────

	private static function config(): array {
		if ( self::$config === null ) {
			$path = GUIDWELL_PLUGIN_DIR . 'config/tiers.json';
			$json = file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions
			if ( $json === false ) {
				wp_die( esc_html__( 'Guidwell: tiers.json is missing. Please reinstall the plugin.', 'guidwell' ) );
			}
			self::$config = json_decode( $json, true ) ?? [];
		}
		return self::$config;
	}

	// ── Current tier ──────────────────────────────────────────────────────────

	/**
	 * Returns the active license tier slug for this install.
	 * Defaults to 'free'. Swap get_option() for a Lemon Squeezy / Freemius
	 * license check when the licensing layer is added.
	 */
	public static function current(): string {
		if ( defined( 'GUIDWELL_INTERNAL_FLAG' ) && GUIDWELL_INTERNAL_FLAG === true ) {
			return 'agency';
		}
		$tier   = get_option( 'guidwell_license_tier', 'free' );
		$valid  = array_column( self::config()['tiers'] ?? [], 'slug' );
		return in_array( $tier, $valid, true ) ? $tier : 'free';
	}

	// ── Feature gates ─────────────────────────────────────────────────────────

	/**
	 * Returns true if the current tier includes the given feature.
	 *
	 * @param string $feature  Key from config/tiers.json "features" object.
	 */
	public static function can( string $feature ): bool {
		$allowed = self::config()['features'][ $feature ]['tiers'] ?? [];
		return in_array( self::current(), $allowed, true );
	}

	/**
	 * Returns the upgrade prompt for a gated feature, or an empty string.
	 *
	 * @param string $feature  Key from config/tiers.json "features" object.
	 */
	public static function upgrade_message( string $feature ): string {
		return self::config()['features'][ $feature ]['upgrade_message'] ?? '';
	}

	// ── Limits ────────────────────────────────────────────────────────────────

	/**
	 * Returns the numeric limit for the current tier, or null for unlimited.
	 *
	 * @param string $key  e.g. 'questions_per_wizard', 'active_wizards', 'sites'
	 * @return int|null
	 */
	public static function limit( string $key ): ?int {
		$tier = self::current();
		foreach ( self::config()['tiers'] ?? [] as $t ) {
			if ( $t['slug'] === $tier ) {
				$val = $t['limits'][ $key ] ?? null;
				return is_int( $val ) ? $val : null;
			}
		}
		return null;
	}

	/**
	 * Convenience: returns true if $count exceeds this tier's limit for $key.
	 * Always returns false when the limit is null (unlimited).
	 *
	 * @param string $key
	 * @param int    $count
	 */
	public static function exceeds_limit( string $key, int $count ): bool {
		$limit = self::limit( $key );
		return $limit !== null && $count > $limit;
	}

	// ── Introspection (used by admin UI + wp_localize_script) ─────────────────

	/**
	 * Returns the full tiers array from the config (for display in admin/JS).
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public static function all_tiers(): array {
		return self::config()['tiers'] ?? [];
	}

	/**
	 * Returns the full features map from the config.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function all_features(): array {
		return self::config()['features'] ?? [];
	}

	/**
	 * Returns a flat summary for the current tier — useful for JS / REST responses.
	 *
	 * @return array<string, mixed>
	 */
	public static function current_summary(): array {
		$slug     = self::current();
		$features = [];

		foreach ( self::config()['features'] ?? [] as $key => $def ) {
			$features[ $key ] = [
				'allowed'         => in_array( $slug, $def['tiers'] ?? [], true ),
				'upgrade_message' => $def['upgrade_message'] ?? '',
			];
		}

		$limits = [];
		foreach ( self::config()['tiers'] ?? [] as $t ) {
			if ( $t['slug'] === $slug ) {
				$limits = $t['limits'] ?? [];
				break;
			}
		}

		return [
			'tier'        => $slug,
			'limits'      => $limits,
			'features'    => $features,
			'upgrade_url' => self::config()['upgrade_url'] ?? '',
		];
	}

	// ── Overage detection ─────────────────────────────────────────────────────

	/**
	 * Scans the current install and returns an array of overage items.
	 * Empty array means everything is within limits.
	 *
	 * Each item: [ 'type', 'message', 'count', 'limit' ]
	 *
	 * Called on admin pages only — never on the frontend.
	 *
	 * @return array<int, array<string, mixed>>
	 */
	public static function overage_report(): array {
		$overages = [];

		// ── Wizard count ──────────────────────────────────────────────────────
		$wizard_limit = self::limit( 'active_wizards' );
		if ( $wizard_limit !== null ) {
			$active = (int) wp_count_posts( 'guidwell_wizard' )->publish;
			if ( $active > $wizard_limit ) {
				$overages[] = [
					'type'    => 'wizard_count',
					'count'   => $active,
					'limit'   => $wizard_limit,
					'message' => sprintf(
						/* translators: 1: active wizard count 2: tier limit */
						__( 'You have %1$d active wizard(s) but your current plan allows %2$d. Your wizards are still live, but you cannot create new ones until you are within the limit or upgrade.', 'guidwell' ),
						$active,
						$wizard_limit
					),
				];
			}
		}

		// ── Questions per wizard ──────────────────────────────────────────────
		$question_limit = self::limit( 'questions_per_wizard' );
		if ( $question_limit !== null ) {
			$wizards = get_posts( [
				'post_type'      => 'guidwell_wizard',
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'fields'         => 'ids',
			] );

			foreach ( $wizards as $wizard_id ) {
				$raw    = get_post_meta( $wizard_id, '_guidwell_wizard_config', true );
				$config = $raw ? json_decode( $raw, true ) : null;
				$count  = is_array( $config['questions'] ?? null ) ? count( $config['questions'] ) : 0;

				if ( $count > $question_limit ) {
					$overages[] = [
						'type'      => 'question_count',
						'wizard_id' => $wizard_id,
						'count'     => $count,
						'limit'     => $question_limit,
						'message'   => sprintf(
							/* translators: 1: wizard title 2: question count 3: tier limit */
							__( '"%1$s" has %2$d questions but your current plan allows %3$d. It is still live, but saving changes is blocked until the question count is reduced or you upgrade.', 'guidwell' ),
							get_the_title( $wizard_id ),
							$count,
							$question_limit
						),
					];
				}
			}
		}

		return $overages;
	}
}
