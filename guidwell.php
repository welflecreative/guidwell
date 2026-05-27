<?php
/**
 * Plugin Name: Guidwell
 * Plugin URI: https://welflecreative.com
 * Description: A customizable guided wizard that recommends the right plan or offer for each visitor.
 * Version: 1.0.0
 * Requires at least: 6.0
 * Requires PHP: 8.1
 * Author: Chad Welfle
 * Author URI: https://welflecreative.com
 * License: GPL v2 or later
 * Text Domain: guidwell
 * Domain Path: /languages
 */

defined( 'ABSPATH' ) || exit;

define( 'GUIDWELL_VERSION', '1.0.0' );
define( 'GUIDWELL_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'GUIDWELL_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once GUIDWELL_PLUGIN_DIR . 'includes/class-guidwell-cpt.php';
require_once GUIDWELL_PLUGIN_DIR . 'includes/class-guidwell-api.php';
require_once GUIDWELL_PLUGIN_DIR . 'includes/class-guidwell-shortcode.php';
require_once GUIDWELL_PLUGIN_DIR . 'includes/class-guidwell-mailer.php';
require_once GUIDWELL_PLUGIN_DIR . 'includes/class-guidwell-smtp.php';

Guidwell_SMTP::init();

if ( is_admin() ) {
	require_once GUIDWELL_PLUGIN_DIR . 'includes/class-guidwell-admin.php';
}

/**
 * Enqueue frontend assets only on pages that use the [guidwell] shortcode.
 * Data is localized here (not in the shortcode render) to guarantee correct timing.
 */
function guidwell_enqueue_assets(): void {
	global $post;

	if ( ! is_a( $post, 'WP_Post' ) || ! has_shortcode( $post->post_content, 'guidwell' ) ) {
		return;
	}

	wp_enqueue_style(
		'guidwell-wizard',
		GUIDWELL_PLUGIN_URL . 'public/css/wizard.css',
		[],
		GUIDWELL_VERSION
	);

	wp_enqueue_script(
		'guidwell-wizard',
		GUIDWELL_PLUGIN_URL . 'public/js/dist/wizard.js',
		[],
		GUIDWELL_VERSION,
		true
	);

	// Respect [guidwell id="X"] if present; otherwise use the first published wizard.
	$wizard_id = 0;
	if ( preg_match( '/\[guidwell[^\]]*\bid=["\']?(\d+)["\']?/i', $post->post_content, $m ) ) {
		$wizard_id = absint( $m[1] );
	}
	if ( $wizard_id <= 0 ) {
		$posts = get_posts( [
			'post_type'      => 'guidwell_wizard',
			'post_status'    => 'publish',
			'posts_per_page' => 1,
			'orderby'        => 'date',
			'order'          => 'ASC',
			'fields'         => 'ids',
		] );
		$wizard_id = ! empty( $posts ) ? (int) $posts[0] : 0;
	}

	$contact_settings = guidwell_get_contact_settings();

	wp_localize_script(
		'guidwell-wizard',
		'guidwellData',
		[
			'wizardId' => $wizard_id,
			'apiBase'  => rest_url( 'guidwell/v1/' ),
			'nonce'    => wp_create_nonce( 'wp_rest' ),
			'settings' => guidwell_get_settings(),
			'config'   => [],
			'contact'  => [
				'sendOnResult'        => ! empty( $contact_settings['sendOnResult'] ),
				'collectVisitorEmail' => ! empty( $contact_settings['collectVisitorEmail'] ),
			],
			'features' => ( function () {
				$raw  = get_option( 'guidwell_features_list', '[]' );
				$list = json_decode( $raw, true );
				return is_array( $list ) ? $list : [];
			} )(),
		]
	);
}
add_action( 'wp_enqueue_scripts', 'guidwell_enqueue_assets' );

/**
 * Retrieve contact/notification settings with defaults.
 *
 * @return array<string, mixed>
 */
function guidwell_get_contact_settings(): array {
	$defaults = [
		'recipientEmail'      => '',
		'recipientName'       => '',
		'senderName'          => __( 'Guidwell', 'guidwell' ),
		'senderEmail'         => get_option( 'admin_email' ),
		'emailSubject'        => '',
		'headerText'          => '',
		'footerText'          => '',
		'sendOnResult'        => false,
		'collectVisitorEmail' => false,
		'useCustomSmtp'       => false,
		'smtpHost'            => '',
		'smtpPort'            => 587,
		'smtpUsername'        => '',
		'smtpPassword'        => '',
		'smtpEncryption'      => 'tls',
	];

	return wp_parse_args( get_option( 'guidwell_contact_settings', [] ), $defaults );
}

/**
 * Retrieve plugin settings from wp_options with defaults.
 *
 * @return array<string, string>
 */
function guidwell_get_settings(): array {
	$defaults = [
		'primaryColor'      => '#4a90a4',
		'primaryDark'       => '#3a7a8c',
		'backgroundColor'   => '#f8f8f6',
		'cardBackground'    => '#ffffff',
		'useThemeColors'    => false,
	];

	$saved = get_option( 'guidwell_settings', [] );

	return wp_parse_args( $saved, $defaults );
}

/**
 * Activation hook — verify minimum WordPress and PHP versions.
 */
function guidwell_activate(): void {
	if ( version_compare( PHP_VERSION, '8.1', '<' ) ) {
		deactivate_plugins( plugin_basename( __FILE__ ) );
		wp_die(
			esc_html__(
				'Guidwell requires PHP 8.1 or higher. Please upgrade PHP before activating this plugin.',
				'guidwell'
			)
		);
	}

	if ( version_compare( get_bloginfo( 'version' ), '6.0', '<' ) ) {
		deactivate_plugins( plugin_basename( __FILE__ ) );
		wp_die(
			esc_html__(
				'Guidwell requires WordPress 6.0 or higher. Please upgrade WordPress before activating this plugin.',
				'guidwell'
			)
		);
	}
}
register_activation_hook( __FILE__, 'guidwell_activate' );

/**
 * Uninstall hook — removes all plugin data from the database.
 */
function guidwell_uninstall(): void {
	require_once GUIDWELL_PLUGIN_DIR . 'includes/class-guidwell-uninstall.php';
	Guidwell_Uninstall::run();
}
register_uninstall_hook( __FILE__, 'guidwell_uninstall' );

/**
 * Load plugin text domain for translations.
 */
function guidwell_load_textdomain(): void {
	load_plugin_textdomain(
		'guidwell',
		false,
		dirname( plugin_basename( __FILE__ ) ) . '/languages'
	);
}
add_action( 'plugins_loaded', 'guidwell_load_textdomain' );
