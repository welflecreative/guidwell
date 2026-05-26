<?php

defined( 'ABSPATH' ) || exit;

class Guidwell_API {

	private const NAMESPACE = 'guidwell/v1';
	private const META_KEY  = '_guidwell_wizard_config';

	public function __construct() {
		add_action( 'rest_api_init', [ $this, 'register_routes' ] );
	}

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/wizard',
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'create_wizard' ],
				'permission_callback' => [ $this, 'can_edit' ],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/settings',
			[
				[
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_settings' ],
					'permission_callback' => [ $this, 'can_manage_options' ],
				],
				[
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'save_settings' ],
					'permission_callback' => [ $this, 'can_manage_options' ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/config/(?P<wizard_id>\d+)',
			[
				[
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_config' ],
					'permission_callback' => '__return_true',
					'args'                => [
						'wizard_id' => [
							'type'     => 'integer',
							'required' => true,
							'minimum'  => 1,
						],
					],
				],
				[
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'save_config' ],
					'permission_callback' => [ $this, 'can_edit' ],
					'args'                => [
						'wizard_id' => [
							'type'     => 'integer',
							'required' => true,
							'minimum'  => 1,
						],
					],
				],
			]
		);
	}

	public function can_edit(): bool {
		return current_user_can( 'edit_posts' );
	}

	public function can_manage_options(): bool {
		return current_user_can( 'manage_options' );
	}

	// -------------------------------------------------------------------------
	// POST /guidwell/v1/wizard — create a new wizard post
	// -------------------------------------------------------------------------

	public function create_wizard( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$title = sanitize_text_field(
			$request->get_param( 'title' ) ?? __( 'My Wizard', 'guidwell' )
		);

		$post_id = wp_insert_post( [
			'post_type'   => 'guidwell_wizard',
			'post_title'  => $title ?: __( 'My Wizard', 'guidwell' ),
			'post_status' => 'publish',
		] );

		if ( is_wp_error( $post_id ) ) {
			return $post_id;
		}

		return rest_ensure_response( [ 'id' => $post_id ] );
	}

	// -------------------------------------------------------------------------
	// GET /guidwell/v1/settings
	// -------------------------------------------------------------------------

	public function get_settings(): WP_REST_Response {
		return rest_ensure_response( guidwell_get_settings() );
	}

	// -------------------------------------------------------------------------
	// POST /guidwell/v1/settings
	// -------------------------------------------------------------------------

	public function save_settings( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body = $request->get_json_params();
		if ( ! is_array( $body ) ) {
			return new WP_Error(
				'guidwell_invalid_body',
				__( 'Request body must be a JSON object.', 'guidwell' ),
				[ 'status' => 400 ]
			);
		}

		$allowed = [ 'primaryColor', 'primaryDark', 'backgroundColor', 'cardBackground' ];
		$clean   = [];

		foreach ( $allowed as $key ) {
			if ( isset( $body[ $key ] ) ) {
				$value = sanitize_hex_color( $body[ $key ] );
				if ( $value ) {
					$clean[ $key ] = $value;
				}
			}
		}

		update_option( 'guidwell_settings', $clean );

		return rest_ensure_response( guidwell_get_settings() );
	}

	// -------------------------------------------------------------------------
	// GET /guidwell/v1/config/{wizard_id}
	// -------------------------------------------------------------------------

	public function get_config( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$post = $this->get_wizard_post( (int) $request['wizard_id'] );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$raw = get_post_meta( $post->ID, self::META_KEY, true );
		if ( empty( $raw ) ) {
			return new WP_Error(
				'guidwell_empty_config',
				__( 'This wizard has no configuration yet.', 'guidwell' ),
				[ 'status' => 400 ]
			);
		}

		$config = json_decode( $raw, true );
		if ( json_last_error() !== JSON_ERROR_NONE ) {
			return new WP_Error(
				'guidwell_invalid_config',
				__( 'Wizard configuration is corrupted.', 'guidwell' ),
				[ 'status' => 500 ]
			);
		}

		return rest_ensure_response( $config );
	}

	// -------------------------------------------------------------------------
	// POST /guidwell/v1/config/{wizard_id}
	// -------------------------------------------------------------------------

	public function save_config( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$post = $this->get_wizard_post( (int) $request['wizard_id'] );
		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$body = $request->get_json_params();
		if ( ! is_array( $body ) ) {
			return new WP_Error(
				'guidwell_invalid_body',
				__( 'Request body must be a JSON object.', 'guidwell' ),
				[ 'status' => 400 ]
			);
		}

		$validation = $this->validate_config( $body );
		if ( is_wp_error( $validation ) ) {
			return $validation;
		}

		$encoded = wp_json_encode( $body );
		update_post_meta( $post->ID, self::META_KEY, $encoded );

		return rest_ensure_response( $body );
	}

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	private function get_wizard_post( int $id ): WP_Post|WP_Error {
		$post = get_post( $id );

		if ( ! $post || $post->post_type !== 'guidwell_wizard' || $post->post_status !== 'publish' ) {
			return new WP_Error(
				'guidwell_not_found',
				__( 'Wizard not found.', 'guidwell' ),
				[ 'status' => 404 ]
			);
		}

		return $post;
	}

	private function validate_config( array $config ): true|WP_Error {
		// questions
		if ( empty( $config['questions'] ) || ! is_array( $config['questions'] ) || count( $config['questions'] ) < 1 ) {
			return new WP_Error(
				'guidwell_invalid_config',
				__( 'Config must include at least one question.', 'guidwell' ),
				[ 'status' => 400 ]
			);
		}

		foreach ( $config['questions'] as $i => $q ) {
			if ( empty( $q['id'] ) || empty( $q['text'] ) || empty( $q['answers'] ) || ! is_array( $q['answers'] ) ) {
				return new WP_Error(
					'guidwell_invalid_config',
					/* translators: %d: question index */
					sprintf( __( 'Question %d must have id, text, and answers.', 'guidwell' ), $i + 1 ),
					[ 'status' => 400 ]
				);
			}

			foreach ( $q['answers'] as $j => $a ) {
				if ( empty( $a['id'] ) || empty( $a['label'] ) || empty( $a['weights'] ) || ! is_array( $a['weights'] ) ) {
					return new WP_Error(
						'guidwell_invalid_config',
						/* translators: %1$d: question index, %2$d: answer index */
						sprintf( __( 'Answer %2$d on question %1$d must have id, label, and weights.', 'guidwell' ), $i + 1, $j + 1 ),
						[ 'status' => 400 ]
					);
				}
			}
		}

		// plans
		if ( empty( $config['plans'] ) || ! is_array( $config['plans'] ) || count( $config['plans'] ) < 2 ) {
			return new WP_Error(
				'guidwell_invalid_config',
				__( 'Config must include at least two plans.', 'guidwell' ),
				[ 'status' => 400 ]
			);
		}

		$required_plan_fields = [ 'slug', 'tier', 'name', 'price', 'ctaLabel', 'ctaUrl' ];
		foreach ( $config['plans'] as $i => $plan ) {
			foreach ( $required_plan_fields as $field ) {
				if ( ! isset( $plan[ $field ] ) || $plan[ $field ] === '' ) {
					return new WP_Error(
						'guidwell_invalid_config',
						/* translators: %1$s: field name, %2$d: plan index */
						sprintf( __( 'Plan %2$d is missing required field: %1$s.', 'guidwell' ), $field, $i + 1 ),
						[ 'status' => 400 ]
					);
				}
			}
		}

		return true;
	}
}

new Guidwell_API();
