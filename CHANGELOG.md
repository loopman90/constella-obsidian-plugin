# Changelog

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
