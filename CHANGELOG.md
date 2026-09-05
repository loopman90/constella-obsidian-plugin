# Changelog

## 0.3.5

- Improved the Quick Bar second-screen button by using Obsidian's pop-out leaf workflow first.
- Focuses the created pop-out leaf and shows a Notice when the display window opens.
- Falls back to opening Constella in the main workspace if pop-out windows are not available.

## 0.3.4

- Removed an unnecessary frontmatter type assertion in graph tag filtering for cleaner review output.

## 0.3.3

- Added an `Include Floating Notes` graph option, enabled by default.
- Local and Current Note scopes can now keep orphan/floating Markdown notes visible even when they are not connected to the active note.
- Floating notes are positioned on an outer ring so they are easier to notice.
- `Show All Notes` now also restores floating-note visibility.

## 0.3.2

- Scoped Constella keyboard shortcuts to the active Constella view.
- Prevented `Enter` in other Obsidian tabs from opening the selected Constella node.
- The settings panel can still close with `Escape` when focus is inside the Constella view.

## 0.3.1

- Added 20 new camera motion styles: Focus Lock, Slow Drift, Wide Orbit, Close Orbit, Breathing Zoom, Presenter Pan, Scanline, Radar Orbit, City Cruise, Data Chase, Cluster Hop, Edge Glide, Constellation Tour, Zen Still, Paper Follow, Matrix Rush, Galaxy Dive, Micro Wander, Overview Pulse, and Second Screen Calm.
- Added camera profiles for follow strength, zoom behavior, orbit, drift, shake, and motion lead.
- Expanded Smart Randomize so it can use the full camera motion library.

## 0.3.0

- Added 20 new visual styles tailored to knowledge graph exploration: Star Chart, Galaxy Spiral, Matrix Grid, Blueprint Lines, Orbital Rings, City Network, Data Stream, Heatmap Cloud, Paper Map, Library Index, Zen Stones, Crystal Lattice, Solar Orbits, Terminal Blocks, Red Scanner, Ocean Bubbles, Prism Shards, Radar Sweep, Topographic, and Circuit Board.
- Added per-style rendering profiles for node shape, edge style, glow behavior, label density, and visual scale.
- Expanded Smart Randomize so it can use the full visual style library.

## 0.2.4

- Added Quick Bar buttons for fullscreen display mode and second-screen pop-out display.
- Reused the same display-mode behavior as the command palette actions, so fullscreen/pop-out stay consistent.

## 0.2.3

- Added `Escape` support to close the Constella settings/control panel when it is open.
- `Escape` now closes the panel before triggering the existing graph stop behavior.

## 0.2.2

- Raised Local Depth defaults and controls so local graphs can expand up to 50 link steps.
- Removed deprecated imperative settings tab rendering in favor of declarative settings definitions.
- Renamed the settings group from `General` to `Plugin preferences`.
- Made frontmatter tag filtering type-safe for stricter review tooling.

## 0.2.1

- Added a `Show All Notes` action that resets graph scope, graph filters, and temporary hide/expand state.
- Fixed older saved templates/settings that did not include new graph filter fields so they cannot accidentally hide all notes.
- Made folder/tag/date/minimum-link filters safer when imported settings are incomplete.

## 0.2.0

- Added note search/focus from the Constella control panel.
- Added graph filters for folders, tags, recent/forgotten notes, and minimum links.
- Added hover highlighting for nodes and immediate neighbors.
- Added pin node, hide node, hide cluster, expand from node, and path preview controls.
- Added background intensity, label size, edge thickness, node size, legend, FPS indicator, and reduce motion controls.
- Grouped built-in templates into Minimal, Cinematic, Data, Calm, Intense, and Utility categories.
- Added reset-to-default actions for major control panel sections.
- Added README preview media and GitHub Actions release workflow.

## 0.1.0

- Initial public build with local-first vault graph rendering, journeys, templates, playlists, display mode, import/export, clustering, and visual effects.
