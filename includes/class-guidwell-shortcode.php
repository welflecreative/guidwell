<?php

defined( 'ABSPATH' ) || exit;

class Guidwell_Shortcode {

	public function __construct() {
		add_shortcode( 'guidwell', [ $this, 'render' ] );
	}

	/**
	 * Render the shortcode mount point and pass runtime data.
	 *
	 * @param array<string, string>|string $atts Shortcode attributes.
	 * @return string
	 */
	public function render( $atts ): string {
		$atts = shortcode_atts( [ 'id' => '' ], $atts, 'guidwell' );

		$wizard_id = $this->resolve_wizard_id( $atts['id'] );

		wp_localize_script(
			'guidwell-wizard',
			'guidwellData',
			[
				'wizardId' => $wizard_id,
				'apiBase'  => rest_url( 'guidwell/v1/' ),
				'nonce'    => wp_create_nonce( 'wp_rest' ),
				'settings' => guidwell_get_settings(),
				'config'   => [],
			]
		);

		return '<div id="guidwell"></div>';
	}

	/**
	 * Resolve wizard ID from shortcode attribute or fallback to first published wizard.
	 */
	private function resolve_wizard_id( string $raw_id ): int {
		$id = (int) $raw_id;
		if ( $id > 0 ) {
			return $id;
		}

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

new Guidwell_Shortcode();
