<?php

defined( 'ABSPATH' ) || exit;

class Guidwell_Elementor_Widget extends \Elementor\Widget_Base {

	public function get_name(): string {
		return 'guidwell_wizard';
	}

	public function get_title(): string {
		return __( 'Guidwell Wizard', 'guidwell' );
	}

	public function get_icon(): string {
		return 'eicon-form-horizontal';
	}

	public function get_categories(): array {
		return [ 'general' ];
	}

	public function get_keywords(): array {
		return [ 'guidwell', 'wizard', 'quiz', 'recommendation', 'plan' ];
	}

	protected function register_controls(): void {
		$this->start_controls_section(
			'content_section',
			[ 'label' => __( 'Wizard', 'guidwell' ) ]
		);

		$wizards = get_posts( [
			'post_type'      => 'guidwell_wizard',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'orderby'        => 'date',
			'order'          => 'ASC',
		] );

		$options = [ '0' => __( 'Auto (first published wizard)', 'guidwell' ) ];
		foreach ( $wizards as $wizard ) {
			$options[ (string) $wizard->ID ] = $wizard->post_title;
		}

		$this->add_control(
			'wizard_id',
			[
				'label'   => __( 'Select Wizard', 'guidwell' ),
				'type'    => \Elementor\Controls_Manager::SELECT,
				'options' => $options,
				'default' => '0',
			]
		);

		$this->end_controls_section();
	}

	protected function render(): void {
		// Show a placeholder in the Elementor editor panel — the wizard JS
		// cannot run inside the editor context, only in the preview iframe.
		if ( \Elementor\Plugin::$instance->editor->is_edit_mode() ) {
			echo '<div style="padding:24px;background:#f0f8fa;border:2px dashed #4a90a4;border-radius:8px;text-align:center;font-family:sans-serif;">';
			echo '<p style="margin:0;color:#4a90a4;font-size:15px;font-weight:600;">Guidwell Wizard</p>';
			echo '<p style="margin:6px 0 0;color:#888;font-size:12px;">Switch to Preview to see the wizard</p>';
			echo '</div>';
			return;
		}

		$wizard_id = (int) $this->get_settings_for_display( 'wizard_id' );
		guidwell_enqueue_wizard_assets( $wizard_id );
		echo '<div id="guidwell" class="guidwell-scoped"></div>';
	}
}
