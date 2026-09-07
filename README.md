# Constella for Obsidian

**Your vault in motion.**

Constella turns your Obsidian vault into an interactive, local-first knowledge graph. Notes become nodes, links become connections, and your graph can be explored manually, through auto-travel journeys, visual templates, playlists, fullscreen mode, or a pop-out display window.

- GitHub: [https://github.com/loopman90/constella-obsidian-plugin](https://github.com/loopman90/constella-obsidian-plugin)
- Releases: [https://github.com/loopman90/constella-obsidian-plugin/releases](https://github.com/loopman90/constella-obsidian-plugin/releases)
- Website: [https://loopman90.github.io/constella-obsidian-plugin/](https://loopman90.github.io/constella-obsidian-plugin/)
- Marketplace kit: [MARKETPLACE.md](MARKETPLACE.md)

Constella is read-only and local. It reads vault metadata to render the graph, but it does not modify notes, does not use analytics, and does not send vault data anywhere.

![Constella preview](docs/media/constella-preview.svg)

## Install From Obsidian

Use this route when Constella is available in the Obsidian Community Plugins browser.

1. Open Obsidian.
2. Open `Settings`.
3. Go to `Community plugins`.
4. Turn off `Restricted mode` if Obsidian asks.
5. Click `Browse`.
6. Search for `Constella`.
7. Click `Install`.
8. Click `Enable`.
9. Run `Constella: Open` from the Command Palette.

If the `Install` or `Add to Obsidian` button is greyed out, check the latest review status on the plugin page and confirm that the GitHub release tag exactly matches the version in `manifest.json`.

## Manual Install

Use this route if you want to test a release before it appears in the Community Plugins browser.

### 1. Download the release files

1. Go to the Constella releases page:
   [https://github.com/loopman90/constella-obsidian-plugin/releases](https://github.com/loopman90/constella-obsidian-plugin/releases)
2. Open the newest release.
3. Download exactly these three files:
   - `main.js`
   - `manifest.json`
   - `styles.css`

Do not download the source code zip for manual installation. Obsidian needs the three built plugin files above.

### 2. Find your vault folder

Your vault is the normal folder where your notes live. Open that folder first, then open or create the hidden `.obsidian/plugins` folder inside it.

The final plugin folder must be named exactly:

```text
constella
```

The final result must look like this on every system:

```text
Your Vault/
  .obsidian/
    plugins/
      constella/
        main.js
        manifest.json
        styles.css
```

### 3. Mac install steps

1. Open Finder.
2. Open your Obsidian vault folder.
3. Press `Command` + `Shift` + `.` to show hidden folders.
4. Open `.obsidian`.
5. Open `plugins`. If it does not exist, create it.
6. Create a folder named `constella`.
7. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.

Mac example:

```text
/Users/your-name/Documents/My Vault/.obsidian/plugins/constella/
```

### 4. Windows install steps

1. Open File Explorer.
2. Open your Obsidian vault folder.
3. Click `View`.
4. Enable `Hidden items` if `.obsidian` is not visible.
5. Open `.obsidian`.
6. Open `plugins`. If it does not exist, create it.
7. Create a folder named `constella`.
8. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.

Windows example:

```text
C:\Users\your-name\Documents\My Vault\.obsidian\plugins\constella\
```

### 5. Linux install steps

1. Open your file manager.
2. Open your Obsidian vault folder.
3. Press `Ctrl` + `H` to show hidden folders if `.obsidian` is not visible.
4. Open `.obsidian`.
5. Open `plugins`. If it does not exist, create it.
6. Create a folder named `constella`.
7. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.

Linux example:

```text
/home/your-name/Documents/My Vault/.obsidian/plugins/constella/
```

### 6. Enable the plugin

1. Restart Obsidian, or go to `Settings` -> `Community plugins` and click `Reload plugins`.
2. Find `Constella` under installed plugins.
3. Enable it.
4. Open the Command Palette:
   - Mac: `Command` + `P`
   - Windows/Linux: `Ctrl` + `P`
5. Run `Constella: Open`.

## Manual Install Troubleshooting

If Constella does not appear in Obsidian:

- Make sure the folder is named `constella`.
- Make sure the folder is inside `.obsidian/plugins/`.
- Make sure `main.js`, `manifest.json`, and `styles.css` are directly inside the `constella` folder.
- Make sure the files are from the same GitHub release.
- Restart Obsidian after copying the files.
- Check `Settings` -> `Community plugins` -> `Installed plugins`.

If Constella opens a blank tab:

- Update to the newest release.
- Restart Obsidian.
- Disable and re-enable Constella.
- Confirm your vault contains Markdown files.
- In Constella, use `Show All Notes`.
- Check whether folder, tag, date, or minimum-link filters are hiding notes.
- Turn on `Include Floating Notes` if you want notes without links to appear.

If not all notes are visible:

- Set Graph Scope to `Global`.
- Set Minimum Links to `0`.
- Clear Folder Filter and Tag Filter.
- Set Date Filter to `All Notes`.
- Enable `Include Floating Notes`.
- Click `Show All Notes`.

## Development Install

Use this route only if you are editing the source code.

```bash
npm install
npm run build
```

Then copy these files into your vault plugin folder:

```text
main.js
manifest.json
styles.css
```

For automatic rebuilds while developing:

```bash
npm run dev
```

## Opening Constella

You can open Constella in several ways:

- Click the ribbon icon in Obsidian.
- Run `Constella: Open` from the Command Palette.
- Click `Constella` in the status bar.

Inside the Constella view:

- Click a node to select it.
- Double-click a node to open the note.
- Hover a node to highlight its direct neighbors.
- Use the Quick Bar to start journeys, switch modes, lock the view, export PNG screenshots, open fullscreen, or open a pop-out display window.

## Main Features

- Interactive Canvas knowledge graph.
- Global, Local, and Current Note graph scopes.
- Floating/orphan note support.
- Search and focus note.
- Optional search results list.
- Folder, tag, date, and minimum-link filters.
- Hover neighbor highlighting.
- Pin node, hide node, hide cluster, expand from node, and path preview.
- Auto-travel journey modes.
- Visual styles, color schemes, camera motion, node movement, pulses, particles, and drawing-line animations.
- Optional cluster halos, node icons, density mode, and depth layers.
- Trackpad-friendly zoom, View Lock, viewport preservation on graph refresh, and optional camera pause after manual navigation.
- Mini-map, graph health panel, legends, FPS indicator, and reduce-motion mode.
- Saved visual templates and playlists.
- PNG screenshot export.
- Fullscreen and second-screen pop-out display.
- JSON import/export for templates and playlists.

## Control Panel

The Control Panel is organized around workflow:

- `Quick`: common actions.
- `Quick UI`: choose which Quick Bar controls are visible, including View Lock.
- `Graph`: scope, depth, floating notes, filters, and node interaction.
- `Tools`: mini-map, search results, graph health, saved views, and color rules.
- `Discovery`: recent, forgotten, hub, orphan, and template filtering.
- `Journey`: auto-travel timing and route behavior.
- `Visual`: visual style, color scheme, glow, node size, edge thickness, cluster halos, node icons, density mode, and depth layers.
- `Background`: background style, intensity, particles, drawing lines, and ambient effects.
- `Motion`: camera, movement style, pulses, click effects, and reduce motion.
- `Paths`: path animation and drawing-line behavior.
- `Presets`: templates and playlists.
- `Display`: labels, overlays, View Lock, viewport preservation, camera pause after manual navigation, legend, FPS, fullscreen intent, cursor hiding, and visual display toggles.

## Keyboard Controls

Inside the Constella view:

- `Space`: start or pause.
- `Arrow Left`: previous journey node.
- `Arrow Right`: next journey node.
- `Enter`: open the selected node.
- `Escape`: stop or close the control panel.

## Privacy

Constella:

- works locally;
- uses no telemetry;
- uses no analytics;
- uploads no vault data;
- does not automatically modify notes;
- uses no external API.

Constella enumerates Markdown files in the vault because it needs file paths and link metadata to draw the graph. This is expected behavior for a local graph plugin.

## Releases

Obsidian expects the GitHub release tag to match the `manifest.json` version exactly.

Constella follows minor-version discipline for larger changes. Do not overwrite existing releases. Use the next meaningful version, such as `0.6.0`, `0.7.0`, and eventually `1.0.0`.

Correct:

```text
0.6.0
```

Incorrect:

```text
v0.6.0
```

Each release must include:

```text
main.js
manifest.json
styles.css
```

The GitHub Actions workflow builds the plugin, uploads release assets, and creates artifact attestations for release files.

## Project Structure

```text
src/
  core/
  graph/
  discovery/
  path/
  templates/
  playlists/
  screensaver/
  display/
  performance/
  settings/
  ui/
docs/
  index.html
  media/
```

## Build Checks

Useful commands:

```bash
npm run typecheck
npm run version:check
npm run build
```

See [CHANGELOG.md](CHANGELOG.md) for release notes.

Use [MARKETPLACE.md](MARKETPLACE.md) for the final Obsidian plugin page text, privacy explanation, screenshot checklist, and release checklist.
