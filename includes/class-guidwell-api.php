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
			'/contact-settings',
			[
				[
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_contact_settings' ],
					'permission_callback' => [ $this, 'can_manage_options' ],
				],
				[
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'save_contact_settings' ],
					'permission_callback' => [ $this, 'can_manage_options' ],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/send-result',
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'send_result' ],
				'permission_callback' => '__return_true',
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/test-email',
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'send_test_email' ],
				'permission_callback' => [ $this, 'can_manage_options' ],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/features',
			[
				[
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_features' ],
					'permission_callback' => '__return_true',
				],
				[
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'save_features' ],
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
		// Tier limit: enforce max active wizards.
		if ( Guidwell_Tiers::limit( 'active_wizards' ) !== null ) {
			$existing = (int) wp_count_posts( 'guidwell_wizard' )->publish;
			if ( Guidwell_Tiers::exceeds_limit( 'active_wizards', $existing ) ) {
				return new WP_Error(
					'guidwell_tier_limit',
					sprintf(
						/* translators: %d: wizard limit for current tier */
						__( 'Your current plan allows a maximum of %d active wizard(s). Upgrade to create more.', 'guidwell' ),
						Guidwell_Tiers::limit( 'active_wizards' )
					),
					[ 'status' => 403 ]
				);
			}
		}

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

		$color_fields = [ 'primaryColor', 'primaryDark', 'backgroundColor', 'cardBackground' ];
		$clean        = [];

		foreach ( $color_fields as $key ) {
			if ( isset( $body[ $key ] ) && $body[ $key ] !== '' ) {
				$value = sanitize_hex_color( $body[ $key ] );
				if ( null === $value ) {
					return new WP_Error(
						'guidwell_invalid_color',
						/* translators: %s: field name */
						sprintf( __( 'Invalid color value for field: %s', 'guidwell' ), $key ),
						[ 'status' => 400 ]
					);
				}
				$clean[ $key ] = $value;
			}
		}

		$clean['useThemeColors'] = ! empty( $body['useThemeColors'] );

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

	// -------------------------------------------------------------------------
	// GET /guidwell/v1/contact-settings
	// -------------------------------------------------------------------------

	public function get_contact_settings(): WP_REST_Response {
		$settings = guidwell_get_contact_settings();
		$settings['smtpPasswordSet'] = ! empty( $settings['smtpPassword'] );
		$settings['smtpPassword']    = '';
		return rest_ensure_response( $settings );
	}

	// -------------------------------------------------------------------------
	// POST /guidwell/v1/contact-settings
	// -------------------------------------------------------------------------

	public function save_contact_settings( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body = $request->get_json_params();
		if ( ! is_array( $body ) ) {
			return new WP_Error( 'guidwell_invalid_body', __( 'Request body must be a JSON object.', 'guidwell' ), [ 'status' => 400 ] );
		}

		$existing = guidwell_get_contact_settings();
		$clean    = [];

		// Required email
		$recipient = sanitize_email( $body['recipientEmail'] ?? '' );
		if ( ! empty( $body['recipientEmail'] ) && ! is_email( $recipient ) ) {
			return new WP_Error( 'guidwell_invalid_email', __( 'recipientEmail is not a valid email address.', 'guidwell' ), [ 'status' => 400 ] );
		}
		$clean['recipientEmail'] = $recipient;

		// Optional email fields
		foreach ( [ 'senderEmail' ] as $field ) {
			if ( ! empty( $body[ $field ] ) ) {
				$val = sanitize_email( $body[ $field ] );
				if ( ! is_email( $val ) ) {
					return new WP_Error( 'guidwell_invalid_email', sprintf( __( '%s is not a valid email address.', 'guidwell' ), $field ), [ 'status' => 400 ] );
				}
				$clean[ $field ] = $val;
			}
		}

		// String fields
		$string_fields = [ 'recipientName', 'senderName', 'emailSubject', 'headerText', 'smtpHost', 'smtpUsername', 'smtpEncryption' ];
		foreach ( $string_fields as $field ) {
			if ( isset( $body[ $field ] ) ) {
				$clean[ $field ] = sanitize_text_field( $body[ $field ] );
			}
		}

		if ( isset( $body['footerText'] ) ) {
			$clean['footerText'] = wp_kses_post( $body['footerText'] );
		}

		// Boolean fields
		foreach ( [ 'sendOnResult', 'collectVisitorEmail', 'useCustomSmtp' ] as $field ) {
			$clean[ $field ] = ! empty( $body[ $field ] );
		}

		// Port
		if ( isset( $body['smtpPort'] ) ) {
			$clean['smtpPort'] = max( 1, min( 65535, absint( $body['smtpPort'] ) ) );
		}

		// Encryption
		if ( isset( $body['smtpEncryption'] ) ) {
			$allowed = [ 'tls', 'ssl', 'none' ];
			$clean['smtpEncryption'] = in_array( $body['smtpEncryption'], $allowed, true ) ? $body['smtpEncryption'] : 'tls';
		}

		// Password: only encrypt and save if a new value was provided
		if ( ! empty( $body['smtpPassword'] ) ) {
			$clean['smtpPassword'] = Guidwell_SMTP::encrypt_password( $body['smtpPassword'] );
		} else {
			$clean['smtpPassword'] = $existing['smtpPassword'] ?? '';
		}

		update_option( 'guidwell_contact_settings', $clean );

		$response = guidwell_get_contact_settings();
		$response['smtpPasswordSet'] = ! empty( $response['smtpPassword'] );
		$response['smtpPassword']    = '';
		return rest_ensure_response( $response );
	}

	// -------------------------------------------------------------------------
	// POST /guidwell/v1/send-result  (public, rate-limited)
	// -------------------------------------------------------------------------

	public function send_result( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$ip_key = 'guidwell_rl_' . md5( $_SERVER['REMOTE_ADDR'] ?? 'unknown' );
		if ( ! $this->check_rate_limit( $ip_key, 5 ) ) {
			return new WP_Error( 'guidwell_rate_limit', __( 'Too many requests. Please try again later.', 'guidwell' ), [ 'status' => 429 ] );
		}

		$body = $request->get_json_params();
		if ( ! is_array( $body ) ) {
			return new WP_Error( 'guidwell_invalid_body', __( 'Invalid request body.', 'guidwell' ), [ 'status' => 400 ] );
		}

		$wizard_id = absint( $body['wizardId'] ?? 0 );
		if ( $wizard_id > 0 ) {
			$post = get_post( $wizard_id );
			if ( ! $post || $post->post_type !== 'guidwell_wizard' || $post->post_status !== 'publish' ) {
				return new WP_Error( 'guidwell_invalid_wizard', __( 'Invalid wizard ID.', 'guidwell' ), [ 'status' => 400 ] );
			}
		}

		$sanitize_plan = function ( $plan ) {
			if ( ! is_array( $plan ) ) return null;
			return [
				'name'        => sanitize_text_field( $plan['name']        ?? '' ),
				'price'       => sanitize_text_field( $plan['price']       ?? '' ),
				'description' => sanitize_text_field( $plan['description'] ?? '' ),
				'ctaLabel'    => sanitize_text_field( $plan['ctaLabel']    ?? '' ),
				'ctaUrl'      => esc_url_raw( $plan['ctaUrl']              ?? '' ),
			];
		};

		$data = [
			'recommendedPlan' => $sanitize_plan( $body['recommendedPlan'] ?? null ),
			'runnerUpPlan'    => isset( $body['runnerUpPlan'] ) ? $sanitize_plan( $body['runnerUpPlan'] ) : null,
			'insight'         => sanitize_text_field( $body['insight'] ?? '' ),
			'visitorEmail'    => sanitize_email( $body['visitorEmail'] ?? '' ) ?: null,
			'wizardId'        => $wizard_id,
		];

		if ( ! $data['recommendedPlan'] || empty( $data['recommendedPlan']['name'] ) ) {
			return new WP_Error( 'guidwell_invalid_plan', __( 'recommendedPlan is required.', 'guidwell' ), [ 'status' => 400 ] );
		}

		$contact = guidwell_get_contact_settings();
		if ( empty( $contact['sendOnResult'] ) ) {
			return rest_ensure_response( [ 'success' => true, 'skipped' => true ] );
		}

		$result = Guidwell_Mailer::send_result_email( $data, $contact );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( [ 'success' => true ] );
	}

	// -------------------------------------------------------------------------
	// POST /guidwell/v1/test-email  (admin only, rate-limited)
	// -------------------------------------------------------------------------

	public function send_test_email( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$user_key = 'guidwell_test_rl_' . get_current_user_id();
		if ( ! $this->check_rate_limit( $user_key, 3 ) ) {
			return new WP_Error( 'guidwell_rate_limit', __( 'Too many test emails. Please wait before sending another.', 'guidwell' ), [ 'status' => 429 ] );
		}

		$contact = guidwell_get_contact_settings();
		$result  = Guidwell_Mailer::send_test_email( $contact );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( [ 'success' => true, 'sentTo' => $contact['recipientEmail'] ] );
	}

	// -------------------------------------------------------------------------
	// Rate limit helper
	// -------------------------------------------------------------------------

	private function check_rate_limit( string $key, int $max ): bool {
		$count = (int) get_transient( $key );
		if ( $count >= $max ) return false;
		set_transient( $key, $count + 1, HOUR_IN_SECONDS );
		return true;
	}

	// -------------------------------------------------------------------------
	// GET /guidwell/v1/features  (public)
	// -------------------------------------------------------------------------

	public function get_features(): WP_REST_Response {
		$raw      = get_option( 'guidwell_features_list', '[]' );
		$features = json_decode( $raw, true );
		return rest_ensure_response( is_array( $features ) ? $features : [] );
	}

	// -------------------------------------------------------------------------
	// POST /guidwell/v1/features  (admin only)
	// -------------------------------------------------------------------------

	public function save_features( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$body = $request->get_json_params();

		if ( ! is_array( $body ) ) {
			return new WP_Error( 'guidwell_invalid_body', __( 'Request body must be a JSON array.', 'guidwell' ), [ 'status' => 400 ] );
		}

		if ( count( $body ) > 100 ) {
			return new WP_Error( 'guidwell_too_many_features', __( 'Maximum 100 features allowed.', 'guidwell' ), [ 'status' => 400 ] );
		}

		$clean = [];
		foreach ( $body as $i => $item ) {
			if (
				! is_array( $item ) ||
				empty( $item['id'] ) || ! is_string( $item['id'] ) ||
				! isset( $item['label'] ) || ! is_string( $item['label'] ) || trim( $item['label'] ) === ''
			) {
				return new WP_Error(
					'guidwell_invalid_feature',
					/* translators: %d: feature index */
					sprintf( __( 'Feature %d must have a non-empty id and label.', 'guidwell' ), $i + 1 ),
					[ 'status' => 400 ]
				);
			}

			$label = sanitize_text_field( $item['label'] );
			if ( mb_strlen( $label ) > 120 ) {
				return new WP_Error(
					'guidwell_feature_label_too_long',
					/* translators: %d: feature index */
					sprintf( __( 'Feature %d label exceeds 120 characters.', 'guidwell' ), $i + 1 ),
					[ 'status' => 400 ]
				);
			}

			$clean[] = [
				'id'    => sanitize_key( $item['id'] ),
				'label' => $label,
			];
		}

		update_option( 'guidwell_features_list', wp_json_encode( $clean ) );
		return rest_ensure_response( $clean );
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

		// Tier limit: enforce max questions per wizard.
		if ( Guidwell_Tiers::exceeds_limit( 'questions_per_wizard', count( $config['questions'] ) ) ) {
			$limit = Guidwell_Tiers::limit( 'questions_per_wizard' );
			return new WP_Error(
				'guidwell_tier_limit',
				sprintf(
					/* translators: %d: question limit for current tier */
					__( 'Your current plan allows a maximum of %d questions per wizard. Upgrade to add more.', 'guidwell' ),
					$limit
				),
				[ 'status' => 403 ]
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

		$required_plan_fields = [ 'slug', 'tier', 'name', 'ctaLabel' ];
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
