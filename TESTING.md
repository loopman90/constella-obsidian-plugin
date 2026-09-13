# Verification

## Automated

Run `npm test`, `npm run typecheck`, and `npm run build`.
The committed tests cover viewport history, forward-branch replacement, history
limits, sequential filter counts, all 10,000 synthetic orphan notes, and recovery
after a graph-load failure. The large-vault test checks data completeness, not
rendering FPS or native Obsidian performance.

Browser component checks additionally exercised settings at 320, 390, 720, and
1280 pixels, numeric slider/reset controls, conditional settings, panel tabs,
settings search, keyboard note selection, and preview empty/missing states.
These checks use an Obsidian API mock and do not replace native integration tests.

## Native Obsidian: Pending

Native UI access was not approved in the development session. None of the checks
below has been marked passed. Use a disposable test vault and the current built
main.js, manifest.json, and styles.css under `.obsidian/plugins/constella/`.

1. Enable the plugin, open its graph, and confirm linked and orphan notes appear.
2. Change theme, zoom, and filters; restart Obsidian and confirm saved preferences.
3. Open a pop-out, move it to a second screen, and test fullscreen and Escape.
4. Zoom and pan with a Mac trackpad. Select two notes and verify Back/Forward
   restores the note and the exact previous zoom/pan without an immediate jump.
5. Preview empty, long, renamed, and deleted notes. Confirm preview does not
   load embedded remote images and Open note navigates only when invoked.
6. Search with the mouse and keyboard, both with results enabled and disabled.
   Confirm settings/preview close restores focus and Enter on a UI button does
   not unexpectedly open a note.
7. Apply folder, tag, date, minimum-link, and hidden-node filters. Confirm the
   exclusion counts plus visible count equal the vault's Markdown count.
8. Test a large synthetic vault with linked notes and orphans. Record frame rate,
   responsiveness, and memory before/after closing and reopening the graph.
9. Disable/re-enable the plugin and close/reopen pop-outs. Check for duplicate
   keyboard actions, lingering animation loops, and console errors.

Do not publish a claim that the native integration suite passed until these
checks have been performed against the exact build being released.
