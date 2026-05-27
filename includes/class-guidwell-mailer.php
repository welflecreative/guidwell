<?php

defined( 'ABSPATH' ) || exit;

class Guidwell_Mailer {

	/**
	 * Send admin notification + optional visitor copy.
	 *
	 * @param array $data             { recommendedPlan, runnerUpPlan, insight, visitorEmail }
	 * @param array $contact_settings
	 */
	public static function send_result_email( array $data, array $contact_settings ): bool|WP_Error {
		$to_email = $contact_settings['recipientEmail'] ?? '';
		if ( ! is_email( $to_email ) ) {
			return new WP_Error(
				'guidwell_no_recipient',
				__( 'No valid recipient email configured.', 'guidwell' )
			);
		}

		$headers = self::build_headers( $contact_settings );
		$subject = $contact_settings['emailSubject'] ?: __( 'New plan recommendation', 'guidwell' );
		$to      = self::format_address( $to_email, $contact_settings['recipientName'] ?? '' );
		$html    = self::build_html_email( $data, $contact_settings, false );

		if ( ! wp_mail( $to, $subject, $html, $headers ) ) {
			return new WP_Error( 'guidwell_mail_failed', __( 'Failed to send notification email.', 'guidwell' ) );
		}

		$visitor_email = $data['visitorEmail'] ?? '';
		if ( is_email( $visitor_email ) ) {
			$site   = $contact_settings['headerText'] ?: __( 'Guidwell', 'guidwell' );
			/* translators: %s: site or brand name */
			$v_subj = sprintf( __( 'Your recommendation from %s', 'guidwell' ), $site );
			$v_html = self::build_html_email( $data, $contact_settings, true );
			wp_mail( $visitor_email, $v_subj, $v_html, $headers );
		}

		return true;
	}

	/**
	 * Send a test email to the configured recipient.
	 */
	public static function send_test_email( array $contact_settings ): bool|WP_Error {
		$data = [
			'recommendedPlan' => [
				'name'        => __( 'Test Plan', 'guidwell' ),
				'price'       => '$99/month',
				'description' => __( 'This is a test email from Guidwell to verify your notification settings.', 'guidwell' ),
				'ctaLabel'    => __( 'Get Started', 'guidwell' ),
				'ctaUrl'      => '',
			],
			'runnerUpPlan'  => null,
			'insight'       => __( 'This is a sample insight message showing how results will appear.', 'guidwell' ),
			'visitorEmail'  => null,
		];

		return self::send_result_email( $data, $contact_settings );
	}

	// ── Private helpers ───────────────────────────────────────────────────────

	private static function build_headers( array $cs ): array {
		$sender_name  = sanitize_text_field( $cs['senderName']  ?? __( 'Guidwell', 'guidwell' ) );
		$sender_email = sanitize_email( $cs['senderEmail'] ?? '' ) ?: get_option( 'admin_email' );
		return [
			'Content-Type: text/html; charset=UTF-8',
			"From: {$sender_name} <{$sender_email}>",
		];
	}

	private static function format_address( string $email, string $name ): string {
		return $name ? "{$name} <{$email}>" : $email;
	}

	private static function build_html_email(
		array $data,
		array $contact_settings,
		bool $is_visitor = false
	): string {
		$primary     = $contact_settings['primaryColor'] ?? '#4a90a4';
		$header_text = $contact_settings['headerText']   ?? '';
		$footer_text = $contact_settings['footerText']   ?? '';
		$recommended = $data['recommendedPlan']          ?? null;
		$runner_up   = $data['runnerUpPlan']             ?? null;
		$insight     = $data['insight']                  ?? '';

		if ( ! $recommended ) return '';

		$header_display = $header_text ?: __( 'Guidwell', 'guidwell' );
		$heading = $is_visitor
			? __( 'Your personalized recommendation', 'guidwell' )
			: __( "Here's what we found", 'guidwell' );

		// Insight block
		$insight_html = '';
		if ( $insight ) {
			$insight_html = sprintf(
				'<p style="font-size:15px;color:#6b7280;font-style:italic;line-height:1.6;'
				. 'margin:0 0 24px 0;padding:16px;background:#f0f7f8;border-radius:6px;'
				. 'border-left:3px solid %s;">%s</p>',
				esc_attr( $primary ),
				esc_html( $insight )
			);
		}

		// CTA button
		$cta_html = '';
		$cta_url  = $recommended['ctaUrl'] ?? '';
		if ( $cta_url && $cta_url !== '#' ) {
			$cta_html = sprintf(
				'<a href="%s" style="display:inline-block;background-color:%s;color:#ffffff;'
				. 'padding:14px 28px;border-radius:6px;text-decoration:none;'
				. 'font-weight:600;font-size:15px;">%s</a>',
				esc_url( $cta_url ),
				esc_attr( $primary ),
				esc_html( $recommended['ctaLabel'] ?? __( 'Learn more', 'guidwell' ) )
			);
		}

		// Runner-up block
		$runner_up_html = '';
		if ( $runner_up && ! empty( $runner_up['name'] ) ) {
			$ru_link = '';
			$ru_url  = $runner_up['ctaUrl'] ?? '';
			if ( $ru_url && $ru_url !== '#' ) {
				$ru_link = sprintf(
					'<a href="%s" style="color:%s;font-size:14px;text-decoration:none;">%s</a>',
					esc_url( $ru_url ),
					esc_attr( $primary ),
					esc_html__( 'Learn more', 'guidwell' )
				);
			}
			$runner_up_html = sprintf(
				'<div style="border-top:1px solid #e0e0e0;margin:24px 0;padding-top:24px;">'
				. '<p style="font-size:13px;color:#6b7280;margin:0 0 8px 0;">%s</p>'
				. '<p style="font-size:16px;font-weight:600;color:#1a1a2e;margin:0 0 8px 0;">'
				.   '%s <span style="color:#6b7280;font-weight:400;">— %s</span>'
				. '</p>'
				. '<p style="font-size:13px;color:#6b7280;margin:8px 0;">%s</p>'
				. '%s'
				. '</div>',
				esc_html__( 'Also worth considering:', 'guidwell' ),
				esc_html( $runner_up['name'] ),
				esc_html( $runner_up['price'] ?? '' ),
				esc_html( $runner_up['description'] ?? '' ),
				$ru_link
			);
		}

		// Footer
		$footer_html = '';
		if ( $footer_text ) {
			$footer_html = sprintf(
				'<p style="font-size:13px;color:#6b7280;margin:0 0 12px 0;">%s</p>',
				wp_kses_post( $footer_text )
			);
		}

		$visitor_note = $is_visitor
			? '<p style="font-size:12px;color:#9ca3af;margin-top:8px;">'
			  . esc_html__( "You're receiving this because you requested your results.", 'guidwell' )
			  . '</p>'
			: '';

		return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>'
			. '<body style="margin:0;padding:0;background-color:#f4f4f4;'
			. 'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;">'
			. '<div style="padding:40px 20px;">'
			. '<div style="background:#ffffff;max-width:600px;margin:0 auto;border-radius:8px;overflow:hidden;">'

			// Header
			. '<div style="background-color:' . esc_attr( $primary ) . ';padding:32px 40px;text-align:center;">'
			. '<p style="color:#ffffff;font-size:22px;font-weight:600;margin:0;">' . esc_html( $header_display ) . '</p>'
			. '</div>'

			// Body
			. '<div style="padding:40px;color:#1a1a2e;">'
			. '<h2 style="font-size:22px;font-weight:700;margin:0 0 16px 0;color:#1a1a2e;">' . esc_html( $heading ) . '</h2>'
			. $insight_html

			// Recommended plan
			. '<div style="background:#f8f8f6;border-radius:8px;padding:24px 28px;margin-bottom:16px;">'
			. '<p style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:' . esc_attr( $primary ) . ';font-weight:700;margin:0 0 8px 0;">'
			.   esc_html__( 'Recommended', 'guidwell' )
			. '</p>'
			. '<p style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 4px 0;">' . esc_html( $recommended['name'] ?? '' ) . '</p>'
			. '<p style="font-size:32px;font-weight:800;color:#1a1a2e;margin:0 0 12px 0;">' . esc_html( $recommended['price'] ?? '' ) . '</p>'
			. '<p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 20px 0;">' . esc_html( $recommended['description'] ?? '' ) . '</p>'
			. $cta_html
			. '</div>'

			. $runner_up_html
			. '</div>'

			// Footer
			. '<div style="background:#f4f4f4;padding:24px 40px;text-align:center;">'
			. $footer_html
			. '<p style="font-size:11px;color:#9ca3af;margin:0;">' . esc_html__( 'Powered by Guidwell', 'guidwell' ) . '</p>'
			. $visitor_note
			. '</div>'

			. '</div></div></body></html>';
	}
}
