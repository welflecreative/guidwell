<?php

defined( 'ABSPATH' ) || exit;

class Guidwell_Admin {

	public function __construct() {
		add_action( 'admin_menu',             [ $this, 'add_menu' ] );
		add_action( 'admin_enqueue_scripts',  [ $this, 'enqueue_scripts' ] );
		add_action( 'admin_notices',          [ $this, 'overage_notices' ] );
	}

	public function add_menu(): void {
		add_menu_page(
			__( 'Guidwell', 'guidwell' ),
			__( 'Guidwell', 'guidwell' ),
			'manage_options',
			'guidwell',
			[ $this, 'render_page' ],
			'dashicons-clipboard',
			30
		);
	}

	public function render_page(): void {
		require_once GUIDWELL_PLUGIN_DIR . 'admin/views/admin-main.php';
	}

	/**
	 * Renders WP admin notices when the current install exceeds the active tier's limits.
	 * Shown on all admin pages so it's hard to miss after a downgrade.
	 */
	public function overage_notices(): void {
		$screen = get_current_screen();
		if ( ! $screen || $screen->id !== 'toplevel_page_guidwell' ) {
			return;
		}

		$overages = Guidwell_Tiers::overage_report();
		if ( empty( $overages ) ) {
			return;
		}

		$tier_label = ucfirst( Guidwell_Tiers::current() );

		echo '<div class="notice notice-warning">';
		echo '<p><strong>' . esc_html(
			sprintf(
				/* translators: %s: tier name */
				__( 'Guidwell — %s plan limit exceeded', 'guidwell' ),
				$tier_label
			)
		) . '</strong></p>';
		echo '<ul style="list-style:disc;padding-left:1.5em;margin:.25em 0 .75em;">';
		foreach ( $overages as $item ) {
			echo '<li>' . esc_html( $item['message'] ) . '</li>';
		}
		echo '</ul>';
		echo '<p>';
		printf(
			/* translators: %s: admin URL */
			esc_html__( 'Your existing content is safe and remains live. %s', 'guidwell' ),
			'<a href="' . esc_url( admin_url( 'admin.php?page=guidwell' ) ) . '">'
				. esc_html__( 'Manage your wizards →', 'guidwell' )
			. '</a>'
		);
		echo '</p>';
		echo '</div>';
	}

	public function enqueue_scripts( string $hook ): void {
		if ( $hook !== 'toplevel_page_guidwell' ) {
			return;
		}

		wp_enqueue_style(
			'guidwell-admin',
			GUIDWELL_PLUGIN_URL . 'admin/css/admin-guidwell.css',
			[],
			GUIDWELL_VERSION
		);

		wp_enqueue_script(
			'guidwell-admin',
			GUIDWELL_PLUGIN_URL . 'admin/js/dist/admin.js',
			[],
			GUIDWELL_VERSION,
			true
		);

		wp_localize_script(
			'guidwell-admin',
			'guidwellAdminData',
			[
				'apiBase'  => rest_url( 'guidwell/v1/' ),
				'nonce'    => wp_create_nonce( 'wp_rest' ),
				'wizardId' => $this->get_first_wizard_id(),
				'settings' => guidwell_get_settings(),
				'tier'     => Guidwell_Tiers::current_summary(),
			]
		);
	}

	private function get_first_wizard_id(): int {
		$posts = get_posts( [
			'post_type'      => 'guidwell_wizard',
			'post_status'    => 'publish',
			'posts_per_page' => 1,
			'orderby'        => 'date',
			'order'          => 'ASC',
			'fields'         => 'ids',
		] );

		return ! empty( $posts ) ? (int) $posts[0] : 0;
	}
}

new Guidwell_Admin();
