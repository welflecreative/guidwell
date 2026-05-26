<?php

defined( 'ABSPATH' ) || exit;

class Guidwell_Admin {

	public function __construct() {
		add_action( 'admin_menu',             [ $this, 'add_menu' ] );
		add_action( 'admin_enqueue_scripts',  [ $this, 'enqueue_scripts' ] );
	}

	public function add_menu(): void {
		add_menu_page(
			__( 'Guidwell', 'guidwell' ),
			__( 'Guidwell', 'guidwell' ),
			'edit_posts',
			'guidwell',
			[ $this, 'render_page' ],
			'dashicons-clipboard',
			30
		);
	}

	public function render_page(): void {
		require_once GUIDWELL_PLUGIN_DIR . 'admin/views/admin-main.php';
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
