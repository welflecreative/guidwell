# Guidwell

A customizable guided wizard that recommends the right plan or offer for each visitor. Visitors answer a short series of questions and receive a personalized recommendation — no coding required to configure.

---

## Requirements

- WordPress 6.0+
- PHP 8.1+
- Node.js 18+ *(for building assets — not needed on the live server)*

---

## Installation

1. Download or clone this repository into your WordPress plugins directory:
   ```
   wp-content/plugins/guidwell/
   ```
2. Run the asset build (one time, or after any code changes):
   ```bash
   npm install
   npm run build
   ```
3. Activate the plugin from **WP Admin → Plugins**.
4. Go to **WP Admin → Guidwell** to configure your wizard.
5. Place `[guidwell]` on any page or post.

---

## Usage

**Basic — uses the first published wizard automatically:**
```
[guidwell]
```

**Specific wizard by post ID:**
```
[guidwell id="42"]
```

---

## Local Development

See the full contributor setup guide in this repo's [development environment section](#local-development-environment).

### Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start the WordPress Docker environment
npm run env:start

# 3. Create the demo page (first time only)
npm run env:setup
```

Visit **http://localhost:8888**. Login at **http://localhost:8888/wp-admin** with `admin` / `password`.

**While developing**, run webpack in watch mode in a second terminal:
```bash
npm run dev
```

Every time you save a file in `public/js/src/` or `public/css/`, webpack rebuilds and your browser refresh shows the change instantly.

### Available commands

| Command | What it does |
|---------|-------------|
| `npm run build` | Production build of all assets |
| `npm run dev` | Webpack watch mode for development |
| `npm test` | Run JavaScript tests (Jest) |
| `npm run test:php` | Run PHP tests (PHPUnit via Docker) |
| `npm run env:start` | Start the WordPress Docker environment |
| `npm run env:stop` | Stop the environment (data persists) |
| `npm run env:clean` | Destroy and rebuild from scratch |
| `npm run env:setup` | First-time demo page setup |

---

## Building Assets

```bash
npm install   # install Node dependencies
npm run build # compile wizard.js and admin.js
```

Compiled files go to:
- `public/js/dist/wizard.js` — frontend wizard
- `admin/js/dist/admin.js` — admin interface

These files are **not committed** to the repository. They must be built before the plugin is usable.

---

## How the Scoring Works

Guidwell uses a **weighted scoring matrix** to match each visitor to the right plan. Here's how it works in plain English:

1. **You assign weights to every answer.** Each answer on each question has a score (0–10) for every plan you've set up. A high score means that answer strongly points toward that plan. A score of 0 means that answer doesn't point to that plan at all.

2. **Scores add up as the visitor answers questions.** Every time a visitor picks an answer, the weights from that answer are added to a running total for each plan.

3. **The plan with the highest total wins.** After all questions are answered, whichever plan accumulated the most points gets recommended to that visitor.

4. **Ties go to the lower-tier plan.** If two plans end up with the same score, the plan with the lower tier number wins. Tier 1 is your most accessible plan, so ties always favor the entry-level option.

**Example:** Say you have three plans — Starter (tier 1), Pro (tier 2), Premium (tier 3). A visitor who picks "Just getting started" might give Starter 3 points, Pro 1 point, and Premium 0 points. A visitor who picks everything in the "growth" direction accumulates more Pro points. At the end, the math decides — no guesswork.

---

## Configuring Your Wizard

### Step 1 — Open the admin panel

Go to **WP Admin → Guidwell**. On your first visit, a starter template is pre-loaded so you have something to work with right away.

### Step 2 — Edit your questions

The left sidebar lists all your questions. Click any question to open it in the editor on the right.

- **Question text** — what you want to ask your visitor
- **Answers** — add as many answer options as you need
- **Weights** — for each answer, enter a score (0–10) for each of your plans. Higher = stronger signal toward that plan

To reorder questions or answers, grab the **≡ handle** and drag.

To add a new question, click **+ Add Question** at the bottom of the sidebar.

### Step 3 — Edit your plans

Click any plan name in the sidebar to open the plan editor.

- **Plan Name** — what visitors will see on the result screen
- **Price** — displayed prominently, e.g. `$750/month`
- **Description** — a sentence or two about what this plan includes
- **CTA Button Label** — the button text, e.g. `Get Started` or `Book a Call`
- **CTA Button URL** — where the button links to

**Tier** is read-only and controls tie-breaking order (lower number = lower cost plan).

### Step 4 — Save

Click **Save All Changes**. On first save, Guidwell creates the wizard in the database automatically.

### Step 5 — Place the shortcode

Add `[guidwell]` to any page. The wizard will load and recommend the right plan based on your configuration.

### Settings tab

Under the **Settings** tab, you can customize the wizard's color scheme to match your brand:

- **Primary Color** — buttons, selected states, progress bar
- **Primary Dark** — hover states
- **Background Color** — the panel behind the wizard card
- **Card Background** — the wizard card itself

Changes apply immediately after clicking **Save Settings**.

---

## Uninstalling

Deactivate and delete the plugin from WP Admin → Plugins. All wizard posts, configurations, and settings are removed from the database automatically — no leftover data.
