<?php

defined( 'ABSPATH' ) || exit;

class Guidwell_SMTP {

	private const CIPHER = 'AES-256-CBC';

	/**
	 * Register the phpmailer_init hook.
	 *
	 * IMPORTANT: This hook fires for ALL wp_mail() calls on the site while
	 * useCustomSmtp is active — not just Guidwell emails. Test carefully on
	 * production sites before enabling.
	 */
	public static function init(): void {
		add_action( 'phpmailer_init', [ self::class, 'configure' ] );
	}

	public static function configure( $phpmailer ): void {
		$settings = get_option( 'guidwell_contact_settings', [] );
		if ( empty( $settings['useCustomSmtp'] ) ) {
			return;
		}

		$phpmailer->isSMTP();
		$phpmailer->Host       = $settings['smtpHost'] ?? '';
		$phpmailer->SMTPAuth   = true;
		$phpmailer->Username   = $settings['smtpUsername'] ?? '';
		$phpmailer->Password   = self::decrypt_password( $settings['smtpPassword'] ?? '' );
		$enc = $settings['smtpEncryption'] ?? 'tls';
		if ( $enc === 'ssl' ) {
			$phpmailer->SMTPSecure = 'ssl';
		} elseif ( $enc === 'tls' ) {
			$phpmailer->SMTPSecure = 'tls';
		} else {
			$phpmailer->SMTPSecure = '';
			$phpmailer->SMTPAutoTLS = false;
		}
		$phpmailer->Port = (int) ( $settings['smtpPort'] ?? 587 );
	}

	public static function encrypt_password( string $password ): string {
		if ( $password === '' ) return '';
		$key = self::get_key();
		$iv  = random_bytes( 16 );
		$enc = openssl_encrypt( $password, self::CIPHER, $key, 0, $iv );
		if ( $enc === false ) return '';
		return base64_encode( $iv . $enc );
	}

	public static function decrypt_password( string $encrypted ): string {
		if ( $encrypted === '' ) return '';
		$key  = self::get_key();
		$data = base64_decode( $encrypted );
		if ( strlen( $data ) <= 16 ) return '';
		$dec = openssl_decrypt( substr( $data, 16 ), self::CIPHER, $key, 0, substr( $data, 0, 16 ) );
		return $dec !== false ? $dec : '';
	}

	private static function get_key(): string {
		if ( defined( 'AUTH_KEY' ) && strlen( AUTH_KEY ) >= 32 ) {
			return substr( hash( 'sha256', AUTH_KEY, true ), 0, 32 );
		}

		$stored = get_option( 'guidwell_smtp_key' );
		if ( ! $stored ) {
			$stored = bin2hex( random_bytes( 16 ) );
			update_option( 'guidwell_smtp_key', $stored, false );
		}
		return substr( hash( 'sha256', $stored, true ), 0, 32 );
	}
}
