# Changelog

## 0.4.4

- Moved the Constella tab layout fallback fully into CSS so the view remains review-compliant without direct style assignments.

## 0.4.3

- Added stronger layout fallbacks for the Constella view so the graph canvas remains visible inside Obsidian tabs and themes.
- Marked the leaf container explicitly while the view is open and removed the marker on close.

## 0.4.2

- Made the Constella view open against Obsidian's stable `contentEl` API instead of relying on internal container child positions.
- Added a visible startup fallback message if the graph view cannot initialize.

## 0.4.1

- Hardened the settings tab for automated review by using an unheaded declarative settings group and explicit overrides.
- Updated the release workflow to use Node 24 and GitHub's current artifact attestation permissions and absolute subject paths.

## 0.4.0

- Added 20 extra exploration modes: Deep Dive, Quick Scan, Review Loop, Idea Hop, Bridge Finder, Cluster Sweep, Orphan Hunt, Timeline Run, Oldest First, Newest First, Dense Route, Sparse Route, Balanced Tour, Serendipity, Research Trail, Writing Map, Project Map, Tag Surf, Folder Walk, and Memory Lane.
- Expanded journey start selection and path weighting so the new modes influence how Constella chooses and travels between notes.
- Updated Smart Randomize so every built-in mode can be selected.

## 0.3.9

- Removed system clipboard access from JSON export, while keeping import/export available through the modal text area.
- Added GitHub Actions artifact attestations for release assets so users can verify release provenance.

## 0.3.8

- Removed the remaining declarative settings group heading so plugin settings do not include avoidable headings.
- Kept the Obsidian declarative settings API in place so settings can appear in settings search on Obsidian 1.13.0 and newer.

## 0.3.7

- Replaced deprecated `workspace.activeLeaf` usage with `workspace.getActiveViewOfType()` for shortcut focus checks.

## 0.3.6

- Removed an unsafe frontmatter tag assignment warning in graph filtering.

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
