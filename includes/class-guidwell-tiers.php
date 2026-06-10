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
			'tier'     => $slug,
			'limits'   => $limits,
			'features' => $features,
		];
	}
}
