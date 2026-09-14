# Changelog

## Unreleased

## 0.9.1

- Moved Back, Forward, and Note Preview into the Quick Bar and added separate visibility settings for each control.
- Added a Graph Status Bar display setting, including the matching official Obsidian setting.
- Promoted Background to a dedicated top-level Control Panel tab so canvas styling is easier to find.

## 0.9.0

- Added configurable interactive node dragging, connected-node movement, auto-pin, pan/zoom switches, double-click behavior, and node context menus.
- Added an interactive graph hand button and camera pause policies, with saved preferences and owner-window pointer handling.
- Added settings search and consolidated duplicated controls into their primary sections.
- Added a local text note preview with loading, empty, missing-note, and retry states.
- Added per-window back/forward history that restores note selection and camera position.
- Made the note-count status clickable with sequential filter exclusion counts and a show-all action.
- Added keyboard selection of search results and focus restoration when closing settings.
- Added graph loading/error/empty states and retry actions.
- Added automated history, filter, large-vault, and refresh-recovery tests. Native Obsidian integration checks remain pending.

## 0.8.1

- Replaced relational CSS selectors with explicit panel, menu, and toggle state classes to avoid broad selector invalidation.

## 0.8.0

- Grouped quick controls into navigation, appearance, actions, and a compact overflow menu.
- Organized settings around seven workflow groups with separate search, health, and saved-view tabs.
- Added editable slider values and per-control resets; hide controls for disabled effects.
- Added visible playback/fullscreen/lock states and a note-count/filter status line.
- Improved narrow-window layouts, panel spacing, keyboard handling in pop-outs, and input focus retention.

## 0.7.1

- Fixed node glow so it remains visible across quiet visual styles, and added the Glow toggle to official Obsidian settings.

## 0.7.0

- Added a marketplace kit with final plugin page text, privacy copy, screenshot guidance, review response text, and release checklist.
- Added Mac trackpad-friendly zoom behavior, preserving the cursor focus point instead of jumping around the graph center.
- Added settings to preserve viewport on graph refresh and temporarily pause automatic camera movement after manual pan or zoom.
- Added a Quick UI View Lock button that freezes automatic camera movement while keeping manual pan and zoom available.

## 0.6.0

- Added a first-run onboarding wizard with Calm, Research, Presentation, and Large Vault starter profiles.
- Added active performance profiles that tune particles, glow, drawing lines, motion, labels, density mode, and FPS visibility.
- Added a dedicated Performance tab to the in-graph Control Panel.
- Added version discipline checks so package, manifest, and Obsidian version metadata stay aligned for future releases.

## 0.5.2

- Added optional Cluster Halos, Node Icons, Density Mode, and Depth Layers visual controls, all disabled by default.
- Added renderer support for cluster halo overlays, note-type canvas icons, large-vault density reduction, and depth-based node emphasis.

## 0.5.1

- Added eight visual styles: Timeline Map, Mind Palace, Circuit Minimal, Archive Fog, Focus Lens, Thread Weaver, Research Board, and Signal Radar.
- Added eight journey modes: Review Queue, Cluster Compare, Bridge Notes, Tag Drift, Orphan Rescue, Writing Flow, Daily Reflection, and Deep Archive.
- Added eight color schemes: Sepia Archive, Polar Night, Electric Lime, Soft Lavender, Copper Blue, Notebook Blue, Ruby Graph, and Moss & Gold.
- Updated Smart Randomize to use the central mode, visual, and color option lists automatically.

## 0.5.0

- Organized official Obsidian settings into clearer Core preferences, Visual controls, Graph tools, and Quick UI groups for a cleaner release-ready settings flow.
- Cleaned up confusing Quick UI settings text before the 0.5.0 release candidate.

## 0.4.9

- Removed the empty-feeling Advanced tab from the in-graph control panel.
- Added a Tools tab with optional search results, graph health insights, saved views, tag/folder color rules, and a mini-map that is off by default.
- Fixed node glow visibility across quiet visual styles and added a Glow Strength slider.
- Added Fog of Knowledge, Ink Map, Neural Bloom, Satellite View, Glass Minimal, and Academic Light visual styles.
- Reordered the in-graph control panel tabs around the user workflow: setup, graph tools, discovery, journeys, visuals, motion, presets, and display.
- Added a Quick UI tab and settings controls for choosing which compact quick bar controls are visible.
- Added an Aqua Mint color scheme built around `#71d7d1`.

## 0.4.8

- Added graph tools panel with mini-map, search results, health insights, saved views, and color rules.

## 0.4.7

- Added selectable drawing-line animation styles for graph edges, including Trace, Reverse Trace, Center Out, Dashed March, Lightning, City Lights, Data Packets, Scanner Sweep, Double Trace, Constellation Sketch, and Radar Fan.
- Updated Smart Randomize so it can choose different drawing-line styles automatically.

## 0.4.6

- Replaced the PNG export link creation with Obsidian's `createEl` helper for cleaner marketplace review output.

## 0.4.5

- Added PNG export for the current Constella graph view from both the command palette and the Quick Bar.

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
