=== Guidwell ===
Contributors: chadwelfle
Tags: quiz, wizard, recommendation, lead generation, marketing
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 8.1
Stable tag: 1.5.6
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A guided recommendation wizard that matches each visitor to the right plan, offer, or service — built natively in WordPress.

== Description ==

Guidwell replaces the guesswork of "which plan is right for me?" with a smart, conversational wizard that scores each visitor's answers and surfaces the option that genuinely fits them.

Most quiz and recommendation tools are hosted SaaS products that charge $30–$100/month and store your data on someone else's server. Guidwell runs entirely inside WordPress: your data stays in your database, you own the experience, and there is no monthly platform fee.

**How it works**

You build a wizard in the WordPress admin — write your questions, add answer choices, set up your plans or offers, and Guidwell scores each visitor's responses to find their strongest match. When they finish, a polished results modal shows them exactly which option fits and why.

**Free plan includes:**

* 1 active wizard
* Up to 5 questions and 5 answers per question
* Up to 3 result plans or offers
* Full frontend wizard rendering on any post or page
* Gutenberg block, shortcode `[guidwell]`, and Elementor widget
* Works on 1 site

**Starter ($79/yr) adds:**

* Up to 15 questions and 10 answers per question
* Up to 5 result plans
* Conditional logic trees (1 level of branching)
* Custom colors and branding to match your site
* Email capture — collect visitor emails and send them their results
* Admin notifications when a visitor completes the wizard
* JSON export to back up or copy wizards
* Works on 1 site

**Pro ($149/yr) adds:**

* Up to 50 questions and 10 answers per question
* Up to 8 result plans
* Conditional logic trees (up to 3 levels of branching)
* JSON import and export
* Basic analytics — completion rates and plan match distribution
* Plan logo and icon images on the results page
* Works on up to 5 sites

**Agency ($299/yr) adds:**

* Up to 100 questions and 20 answers per question
* Up to 15 result plans
* Unlimited conditional logic depth and nodes
* Full analytics and reporting
* White-label — remove the "Powered by Guidwell" badge
* Email integrations (Mailchimp, ConvertKit)
* Works on up to 25 sites

**Embedding options**

* **Gutenberg block** — search for "Guidwell Wizard" in the block inserter
* **Shortcode** — `[guidwell]` or `[guidwell id="123"]` for a specific wizard
* **Elementor** — Guidwell Wizard widget available in the Elementor panel

**Privacy**

Guidwell does not send any visitor data to external servers. All wizard configurations and visitor responses are stored in your WordPress database. If email capture is enabled, collected emails are stored locally and only transmitted if you connect an email integration (Agency plan).

== Installation ==

1. Upload the `guidwell` folder to `/wp-content/plugins/` or install via **Plugins > Add New** in WordPress admin.
2. Activate the plugin.
3. Go to **Guidwell** in the WordPress admin menu.
4. Create your first wizard — add questions, answers, and plans.
5. Embed the wizard on any page using the Gutenberg block, the `[guidwell]` shortcode, or the Elementor widget.

== Frequently Asked Questions ==

= Does this work with my theme? =

Yes. Guidwell renders a full-bleed card that breaks out of your theme's content column automatically. It has been tested with Twenty Twenty-Four, Astra, Kadence, and GeneratePress.

= Can I have more than one wizard? =

Each plan currently supports 1 active wizard. Multiple wizard support is on the roadmap.

= What happens if I do not renew my paid plan? =

Your wizard keeps working — visitors can still take it and see results. The only thing that stops is automatic plugin updates. You will need to update the plugin manually or renew to resume automatic updates.

= Does Guidwell store visitor data? =

Guidwell does not log individual visitor responses by default. If you enable email capture (Starter+), the visitor's email address and their result are stored in your WordPress database. No data is sent to external servers unless you connect an email integration.

= Is Guidwell compatible with page builders? =

Yes. Guidwell includes a native Gutenberg block and an Elementor widget. For other page builders, use the `[guidwell]` shortcode.

= Can I import a wizard from another site? =

JSON import is available on Pro and Agency plans. Export is available on Starter and above.

= Where can I get help? =

Documentation is at [https://welflecreative.wordpress.com/guidwell/](https://welflecreative.wordpress.com/guidwell/). For support, visit [https://welflecreative.com](https://welflecreative.com).

== Screenshots ==

1. The Wizard Builder — write questions, define answer choices, and manage result plans from a single tabbed interface.
2. The Logic canvas — connect questions with branching paths using a visual drag-and-drop tree editor (Starter+).
3. Admin notifications and email capture settings.
4. Plugin settings — custom colors, fonts, branding, and export/import controls.
5. The frontend wizard as visitors see it — clean card layout, smooth transitions.
6. The results modal — shows the matched plan, an AI-generated explanation, and a call-to-action.
7. Mobile view — fully responsive at all breakpoints.

== Changelog ==

= 1.5.6 =
* Fixed focus outline appearing on question heading when wizard loads

= 1.5.5 =
* Multi-select question type — allow visitors to choose more than one answer per question
* Filter zero-score plans from results

= 1.5.4 =
* Fixed canvas scroll behavior in Logic tab

= 1.5.0 =
* Gutenberg block with alignment support (wide and full)
* Centralized mount point function for block, shortcode, and Elementor paths
* Tier gate enforced at read time for white-label setting

= 1.4.2 =
* Docs site with full user guide, API reference, pricing, and changelog
* SVG favicon across all docs pages

= 1.4.0 =
* Elementor widget support
* Full-bleed layout alignment correction for padded theme containers

= 1.3.0 =
* Conditional logic tree editor with visual canvas
* Plan logo and icon image support (Pro+)
* Basic analytics (Pro+)

= 1.0.0 =
* Initial release

== Upgrade Notice ==

= 1.5.6 =
Minor visual fix — no action required.
