import { build } from "esbuild";
import assert from "node:assert/strict";
import { test } from "node:test";

const { outputFiles } = await build({
  stdin: { contents: `export { relatedNotes, compareConnections } from './src/graph/WorkspaceInsights'; export { ConstellaController } from './src/core/ConstellaController'; export { DEFAULT_SETTINGS, normalizeSettings } from './src/settings/Settings'; export { ConstellaGraphRenderer } from './src/graph/ConstellaGraphRenderer';`, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node"
});
const { relatedNotes, compareConnections, ConstellaController, DEFAULT_SETTINGS, normalizeSettings, ConstellaGraphRenderer } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);
const nodes = ["Projects/a.md", "Projects/b.md", "Other/c.md", "Other/d.md"].map((path, index) => ({ id: path, path, title: String(index), file: { path, stat: { mtime: index + 1 } } }));
const edges = [{ source: nodes[0].id, target: nodes[2].id }, { source: nodes[1].id, target: nodes[2].id }];

test("related notes explain tags, folders, direct and shared connections without including the selected note", () => {
  const results = relatedNotes({ nodes, edges }, nodes[0], node => node === nodes[0] || node === nodes[1] ? ["#project"] : []);
  assert.equal(results[0].node.id, nodes[1].id);
  assert.deepEqual(results[0].reasons, ["Shared tags: #project", "1 shared neighbors", "Same folder"]);
  assert.equal(results.some(item => item.node === nodes[0] || item.node === nodes[3]), false);
  assert.deepEqual(compareConnections({ nodes, edges }, nodes[0].id, nodes[1].id), { shared: [nodes[2].id], leftOnly: [], rightOnly: [] });
});

function fixture() {
  const files = nodes.map(node => ({ ...node.file, basename: node.title }));
  return { vault: { getMarkdownFiles: () => files }, metadataCache: { resolvedLinks: { [nodes[0].id]: { [nodes[2].id]: 1 } }, getFileCache: () => null }, workspace: { getActiveFile: () => files[0] } };
}

test("bookmarks and routes survive saving and old settings gain safe defaults", async () => {
  const app = fixture(); let saved;
  const settings = normalizeSettings({ configuration: DEFAULT_SETTINGS.configuration });
  const controller = new ConstellaController(app, {}, settings, async data => { saved = structuredClone(data); });
  await controller.toggleBookmark(nodes[0].path);
  await controller.savePresentation("Research", [nodes[1].path, nodes[0].path]);
  assert.deepEqual(saved.workspaceTools.bookmarks, [nodes[0].path]);
  assert.deepEqual(saved.workspaceTools.routes[0].paths, [nodes[1].path, nodes[0].path]);
  await controller.toggleBookmark(nodes[0].path);
  assert.deepEqual(saved.workspaceTools.bookmarks, []);
  assert.equal(saved.configuration.tools.screenshotPrivacy, false);
});

test("manual presentation preserves order, skips unavailable notes and never opens files", () => {
  const controller = new ConstellaController(fixture(), {}, structuredClone(DEFAULT_SETTINGS), async () => {});
  controller.refreshGraph();
  assert.equal(controller.startPresentation(["missing.md", nodes[1].path, nodes[0].path]), true);
  assert.equal(controller.currentNode.path, nodes[1].path);
  controller.movePresentation(1);
  assert.equal(controller.currentNode.path, nodes[0].path);
  controller.movePresentation(1);
  assert.equal(controller.presentationIndex, 1);
  controller.movePresentation(-1);
  assert.equal(controller.currentNode.path, nodes[1].path);
  controller.endPresentation();
  assert.equal(controller.presentationPaths.length, 0);
});

test("change snapshots include the whole vault and remain stable until explicitly marked seen", async () => {
  const app = fixture(); let saved;
  const controller = new ConstellaController(app, {}, structuredClone(DEFAULT_SETTINGS), async data => { saved = structuredClone(data); });
  await controller.markGraphChangesSeen();
  const before = structuredClone(saved.workspaceTools.snapshot);
  app.vault.getMarkdownFiles()[0].stat.mtime = 999;
  app.metadataCache.resolvedLinks[nodes[1].id] = { [nodes[3].id]: 1 };
  assert.equal(controller.vaultSnapshot().edges.length, 2);
  assert.deepEqual(controller.workspaceTools.snapshot, before);
  await controller.markGraphChangesSeen();
  assert.equal(saved.workspaceTools.snapshot.notes[nodes[0].id], 999);
});

test("private PNG captures no labels and restores the live config before asynchronous encoding", async () => {
  const renderer = Object.create(ConstellaGraphRenderer.prototype);
  renderer.config = structuredClone(DEFAULT_SETTINGS.configuration);
  const original = renderer.config; const captures = [];
  renderer.resize = () => {};
  renderer.draw = () => captures.push(renderer.config.display.showLabels);
  renderer.canvas = { width: 100, height: 100, ownerDocument: { createEl: () => ({ getContext: () => ({ drawImage() {} }), toBlob: callback => queueMicrotask(() => callback(new Blob(["image"]))) }) } };
  await renderer.exportPng(true);
  assert.deepEqual(captures, [false, true]);
  assert.equal(renderer.config, original);
});
