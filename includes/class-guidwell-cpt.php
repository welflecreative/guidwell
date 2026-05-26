<?php

defined( 'ABSPATH' ) || exit;

class Guidwell_CPT {

	public function __construct() {
		add_action( 'init', [ $this, 'register_post_type' ] );
		add_action( 'init', [ $this, 'register_meta' ] );
	}

	public function register_post_type(): void {
		register_post_type(
			'guidwell_wizard',
			[
				'labels'              => [
					'name'               => __( 'Plan Wizards', 'guidwell' ),
					'singular_name'      => __( 'Plan Wizard', 'guidwell' ),
					'add_new_item'       => __( 'Add New Plan Wizard', 'guidwell' ),
					'edit_item'          => __( 'Edit Plan Wizard', 'guidwell' ),
					'new_item'           => __( 'New Plan Wizard', 'guidwell' ),
					'view_item'          => __( 'View Plan Wizard', 'guidwell' ),
					'search_items'       => __( 'Search Plan Wizards', 'guidwell' ),
					'not_found'          => __( 'No plan wizards found.', 'guidwell' ),
					'not_found_in_trash' => __( 'No plan wizards found in Trash.', 'guidwell' ),
				],
				'public'              => false,
				'publicly_queryable'  => false,
				'show_ui'             => true,
				'show_in_menu'        => true,
				'show_in_rest'        => false,
				'supports'            => [ 'title', 'custom-fields' ],
				'capability_type'     => 'post',
				'menu_icon'           => 'dashicons-clipboard',
				'rewrite'             => false,
			]
		);
	}

	public function register_meta(): void {
		register_post_meta(
			'guidwell_wizard',
			'_guidwell_wizard_config',
			[
				'type'          => 'string',
				'single'        => true,
				'show_in_rest'  => false,
				'auth_callback' => static function (): bool {
					return current_user_can( 'edit_posts' );
				},
			]
		);
	}
}

new Guidwell_CPT();
