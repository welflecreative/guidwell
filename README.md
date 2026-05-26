# Guidwell

A WordPress plugin that guides visitors through a short question wizard and recommends the right plan or offer for them.

---

## Local Development

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Docker Compose)
- [Node.js](https://nodejs.org/) v18+

### First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Start the WordPress Docker environment (takes ~2 min on first run)
npm run env:start

# 3. Create the demo page and configure the site
npm run env:setup
```

That's it. Visit **http://localhost:8888** to see the wizard running live.

| URL | Credentials |
|-----|-------------|
| http://localhost:8888 | — |
| http://localhost:8888/wp-admin | `admin` / `password` |

---

### Day-to-day workflow

You need two terminals open while developing:

**Terminal 1 — WordPress environment**
```bash
npm run env:start
```

**Terminal 2 — JS/CSS build watcher**
```bash
npm run dev
```

Save any file in `public/js/src/` or `public/css/` and webpack rebuilds automatically. Refresh the browser to see changes — no plugin reinstall, no file copying required.

---

### Available commands

| Command | Description |
|---------|-------------|
| `npm run env:start` | Start the WordPress Docker environment |
| `npm run env:stop` | Stop the environment (data persists) |
| `npm run env:restart` | Restart after config changes |
| `npm run env:clean` | Destroy and rebuild from scratch |
| `npm run env:logs` | Stream Docker logs |
| `npm run env:setup` | Create demo page (run once after first start) |
| `npm run dev` | Start webpack in watch mode |
| `npm run build` | Production build |

Run any WP-CLI command against the dev environment:
```bash
npm run env:cli -- post list
npm run env:cli -- plugin list
npm run env:cli -- option get siteurl
```

---

### How it works

- `@wordpress/env` runs WordPress + MariaDB in Docker
- The plugin folder is mounted directly into the container — no copying or symlinks
- `npm run dev` writes compiled JS to `public/js/dist/wizard.js`, which the container serves immediately
- `WP_DEBUG` and `SCRIPT_DEBUG` are enabled by default in the dev environment

---

### Resetting the environment

If the environment gets into a bad state:

```bash
npm run env:clean    # destroys all Docker containers and volumes, then restarts
npm run env:setup    # re-run first-time page setup
```
