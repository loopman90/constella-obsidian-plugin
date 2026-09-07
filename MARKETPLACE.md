# Constella Marketplace Kit

Use this file when preparing the Obsidian Community Plugins page, GitHub release notes, screenshots, and review answers.

## Short Description

Explore your vault as an interactive, local-first knowledge graph with journeys, visual styles, filters, presets, fullscreen display, and PNG export.

## Long Description

Constella turns your Obsidian vault into an interactive, local-first knowledge graph. Notes become nodes, links become connections, and your graph can be explored manually or through auto-travel journeys. Search and focus notes, filter by folder, tag, date, or link count, reveal floating notes, inspect graph health, pin or hide nodes, preview paths, and save visual templates or playlists. Constella includes many visual styles, color schemes, camera motions, drawing-line animations, cluster halos, node icons, density mode, depth layers, fullscreen mode, second-screen pop-out display, and PNG screenshot export. Everything stays local: Constella reads Obsidian metadata to draw the graph, does not edit note content, does not use telemetry or analytics, and does not send vault data anywhere.

Character count: 863.

## Feature Bullets

- Interactive local Canvas graph for Markdown notes and resolved links.
- Global, Local, and Current Note scopes.
- Search, filters, graph health, mini-map, saved views, and color rules.
- Pin nodes, hide nodes or clusters, expand from a note, and preview paths.
- Auto-travel modes for recent notes, forgotten notes, hubs, clusters, orphans, writing flow, and deep archive.
- Visual styles, color schemes, camera motion, particles, pulses, drawing-line animations, cluster halos, node icons, density mode, and depth layers.
- First-run onboarding wizard with Calm, Research, Presentation, and Large Vault profiles.
- Fullscreen, second-screen pop-out, PNG export, template export/import, and playlists.

## Privacy Text

Constella is local-first and read-only. It uses Obsidian's metadata APIs to enumerate Markdown files and resolved links so it can draw the graph. It does not modify note content automatically, does not use external APIs, does not send vault data over the network, and does not include telemetry or analytics.

Expected review disclosure:

- Vault Enumeration: required to discover Markdown files and links for graph rendering.
- Clipboard Access: not used by current import/export flow.
- Network Requests: none expected.

## Screenshot Checklist

Use a clean demo vault without private names, personal paths, private notes, emails, API keys, customer names, or real project details.

Recommended screenshots:

1. `docs/media/screenshots/01-main-graph.png`  
   Main Constella graph with labels, clusters, and Quick Bar visible.
2. `docs/media/screenshots/02-visual-styles.png`  
   Visual dropdown or multiple visual examples.
3. `docs/media/screenshots/03-search-tools.png`  
   Search results, mini-map, graph health, and filters.
4. `docs/media/screenshots/04-performance-settings.png`  
   Onboarding or Performance tab with Large Vault profile.
5. `docs/media/screenshots/05-presentation-export.png`  
   Fullscreen or PNG export view.

Image guidance:

- Use 1600x900 or 1920x1080 when possible.
- Keep text readable at marketplace thumbnail size.
- Do not show private vault paths.
- Do not show private note titles.
- Prefer demo notes with safe names such as Projects, Research, Ideas, Daily Notes, Archive, Reading, and Writing.

## Release Checklist

Before publishing a marketplace-facing release:

1. Update `manifest.json`, `package.json`, `package-lock.json`, `versions.json`, and `CHANGELOG.md`.
2. Use the next meaningful version. Do not overwrite existing releases.
3. Run:

```bash
npm run version:check
npm run typecheck
npm run build
```

4. Confirm the review scan has no known source-code issues.
5. Commit and push `main`.
6. Tag the release without a leading `v`, for example:

```bash
git tag 0.6.0
git push origin 0.6.0
```

7. Confirm the GitHub release contains:

```text
main.js
manifest.json
styles.css
```

8. Confirm GitHub Actions created artifact attestations.
9. Confirm the GitHub Pages website still works:
   [https://loopman90.github.io/constella-obsidian-plugin/](https://loopman90.github.io/constella-obsidian-plugin/)

## Review Response Template

Constella enumerates Markdown files and resolved links in the vault because this is necessary to render a local knowledge graph. The plugin is read-only for note content, does not use telemetry or analytics, does not send vault data anywhere, and does not make external network requests. Import/export is handled through local dialogs and release assets are built by GitHub Actions with artifact attestations.

## Links

- GitHub: [https://github.com/loopman90/constella-obsidian-plugin](https://github.com/loopman90/constella-obsidian-plugin)
- Releases: [https://github.com/loopman90/constella-obsidian-plugin/releases](https://github.com/loopman90/constella-obsidian-plugin/releases)
- Website: [https://loopman90.github.io/constella-obsidian-plugin/](https://loopman90.github.io/constella-obsidian-plugin/)
