<?php

defined( 'ABSPATH' ) || exit;

class Guidwell_Uninstall {

	public static function run(): void {
		self::delete_wizard_posts();
		delete_option( 'guidwell_settings' );
		delete_option( 'guidwell_contact_settings' );
		delete_option( 'guidwell_smtp_key' );
	}

	private static function delete_wizard_posts(): void {
		$post_ids = get_posts( [
			'post_type'      => 'guidwell_wizard',
			'post_status'    => 'any',
			'posts_per_page' => -1,
			'fields'         => 'ids',
		] );

		foreach ( $post_ids as $post_id ) {
			// Force-delete: bypass trash so no data is left behind.
			wp_delete_post( (int) $post_id, true );
		}
	}
}
