<?php

defined( 'ABSPATH' ) || exit;

class Guidwell_Shortcode {

	public function __construct() {
		add_shortcode( 'guidwell', [ $this, 'render' ] );
	}

	/**
	 * Render the shortcode mount point. Data is localized in guidwell_enqueue_assets().
	 *
	 * @param array<string, string>|string $atts Shortcode attributes.
	 * @return string
	 */
	public function render( $atts ): string {
		return guidwell_mount_point();
	}
}

new Guidwell_Shortcode();
