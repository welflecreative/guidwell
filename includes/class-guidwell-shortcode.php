<?php

defined( 'ABSPATH' ) || exit;

/**
 * Registers and renders the [guidwell] shortcode.
 */
class Guidwell_Shortcode {

	public function __construct() {
		add_shortcode( 'guidwell', [ $this, 'render' ] );
	}

	/**
	 * Render the shortcode mount point.
	 *
	 * @return string
	 */
	public function render(): string {
		return '<div id="guidwell"></div>';
	}
}

new Guidwell_Shortcode();
