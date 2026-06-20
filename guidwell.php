<?php
/**
 * Plugin Name: Guidwell
 * Plugin URI: https://welflecreative.com
 * Description: A customizable guided wizard that recommends the right plan or offer for each visitor.
 * Version: 1.3.2
 * Requires at least: 6.0
 * Requires PHP: 8.1
 * Author: Chad Welfle
 * Author URI: https://welflecreative.com
 * License: GPL v2 or later
 * Text Domain: guidwell
 * Domain Path: /languages
 */

defined( 'ABSPATH' ) || exit;

define( 'GUIDWELL_VERSION', '1.3.2' );
define( 'GUIDWELL_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'GUIDWELL_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Auto-updates via GitHub Releases. Only active when the library is present (i.e. in a built zip).
if ( file_exists( GUIDWELL_PLUGIN_DIR . 'vendor/autoload.php' ) ) {
	require_once GUIDWELL_PLUGIN_DIR . 'vendor/autoload.php';
	$guidwell_update_checker = YahnisElsts\PluginUpdateChecker\v5\PucFactory::buildUpdateChecker(
		'https://github.com/welflecreative/guidwell/',
		__FILE__,
		'guidwell'
	);
	$guidwell_update_checker->getVcsApi()->enableReleaseAssets();
}

require_once GUIDWELL_PLUGIN_DIR . 'includes/class-guidwell-tiers.php';
require_once GUIDWELL_PLUGIN_DIR . 'includes/class-guidwell-cpt.php';
require_once GUIDWELL_PLUGIN_DIR . 'includes/class-guidwell-api.php';
require_once GUIDWELL_PLUGIN_DIR . 'includes/class-guidwell-shortcode.php';
require_once GUIDWELL_PLUGIN_DIR . 'includes/class-guidwell-mailer.php';
require_once GUIDWELL_PLUGIN_DIR . 'includes/class-guidwell-smtp.php';

Guidwell_SMTP::init();

if ( is_admin() ) {
	require_once GUIDWELL_PLUGIN_DIR . 'includes/class-guidwell-admin.php';
}

// Register Guidwell as a native Elementor widget when Elementor is active.
add_action( 'elementor/widgets/register', function ( $widgets_manager ) {
	require_once GUIDWELL_PLUGIN_DIR . 'includes/class-guidwell-elementor-widget.php';
	$widgets_manager->register( new Guidwell_Elementor_Widget() );
} );

// Ensure wizard assets are always available in Elementor's preview iframe.
add_action( 'elementor/preview/enqueue_scripts', function () {
	guidwell_enqueue_wizard_assets( 0 );
} );

/**
 * Enqueue and localize the wizard frontend assets.
 * Called by both the shortcode path (via wp_enqueue_scripts) and the block render callback.
 *
 * @param int $wizard_id 0 means auto-select the first published wizard.
 */
function guidwell_enqueue_wizard_assets( int $wizard_id = 0 ): void {
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
			'tier'     => Guidwell_Tiers::current_summary(),
		]
	);
}

/**
 * Enqueue frontend assets only on pages that contain the [guidwell] shortcode.
 */
function guidwell_enqueue_assets(): void {
	global $post;

	if ( ! is_a( $post, 'WP_Post' ) || ! has_shortcode( $post->post_content, 'guidwell' ) ) {
		return;
	}

	// Respect [guidwell id="X"] if present; otherwise auto-select.
	$wizard_id = 0;
	if ( preg_match( '/\[guidwell[^\]]*\bid=["\']?(\d+)["\']?/i', $post->post_content, $m ) ) {
		$wizard_id = absint( $m[1] );
	}

	guidwell_enqueue_wizard_assets( $wizard_id );
}
add_action( 'wp_enqueue_scripts', 'guidwell_enqueue_assets' );

/**
 * Register the Gutenberg block.
 */
function guidwell_register_block(): void {
	// Register the editor script manually so we can declare WP package
	// dependencies explicitly — plain webpack doesn't emit an .asset.php file.
	wp_register_script(
		'guidwell-block-editor',
		GUIDWELL_PLUGIN_URL . 'public/js/dist/block.js',
		[ 'wp-blocks', 'wp-block-editor', 'wp-components', 'wp-data', 'wp-i18n', 'wp-element' ],
		GUIDWELL_VERSION,
		true
	);

	register_block_type(
		GUIDWELL_PLUGIN_DIR . 'public/js/block.json',
		[
			'render_callback' => 'guidwell_render_wizard_block',
		]
	);
}
add_action( 'init', 'guidwell_register_block' );

/**
 * Server-side render callback for the guidwell/wizard block.
 *
 * @param array<string, mixed> $attributes Block attributes.
 * @return string
 */
function guidwell_render_wizard_block( array $attributes ): string {
	$wizard_id = isset( $attributes['wizardId'] ) ? absint( $attributes['wizardId'] ) : 0;
	guidwell_enqueue_wizard_assets( $wizard_id );
	return '<div id="guidwell" class="guidwell-scoped"></div>';
}

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
