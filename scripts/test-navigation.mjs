import { build } from "esbuild";
import assert from "node:assert/strict";
import { test } from "node:test";

const { outputFiles } = await build({
  stdin: { contents: `export { NavigationHistory } from './src/ui/NavigationHistory'; export { GraphDataService } from './src/graph/GraphDataService'; export { DEFAULT_CONFIGURATION } from './src/core/ActiveConfiguration'; export { ConstellaController } from './src/core/ConstellaController'; export { DEFAULT_SETTINGS } from './src/settings/Settings';`, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node"
});
const { NavigationHistory, GraphDataService, DEFAULT_CONFIGURATION, ConstellaController, DEFAULT_SETTINGS } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);
const view = (x) => ({ x, y: -x, scale: 0.5 });

test("history restores the viewport before departure and drops abandoned forward entries", () => {
  const history = new NavigationHistory();
  history.visit({ nodeId: null, viewport: view(0) }, view(0));
  history.visit({ nodeId: "a", viewport: view(10) }, view(5));
  history.visit({ nodeId: "b", viewport: view(20) }, view(15));
  assert.deepEqual(history.move(-1, view(25)), { nodeId: "a", viewport: view(15) });
  assert.deepEqual(history.move(1, view(16)), { nodeId: "b", viewport: view(25) });
  history.move(-1, view(25));
  history.visit({ nodeId: "c", viewport: view(30) }, view(16));
  assert.equal(history.canForward, false);
  assert.equal(history.move(-1, view(30)).nodeId, "a");
  assert.deepEqual(history.move(-1, view(16)), { nodeId: null, viewport: view(5) });
  assert.equal(history.move(-1, view(5)), null);
});

test("history is bounded and duplicate selection does not discard forward history", () => {
  const history = new NavigationHistory();
  for (let i = 0; i < 150; i++) history.visit({ nodeId: String(i), viewport: view(i) }, view(i - 1));
  history.move(-1, view(150));
  history.visit({ nodeId: "148", viewport: view(0) }, view(0));
  assert.equal(history.canForward, true);
  let count = 0;
  while (history.move(-1, view(0))) count++;
  assert.equal(count, 98);
});

function fixture(paths) {
  const files = paths.map((path) => ({ path, basename: path.split('/').pop(), stat: { mtime: Date.now() } }));
  return { vault: { getMarkdownFiles: () => files }, metadataCache: { resolvedLinks: {}, getFileCache: () => null }, workspace: { getActiveFile: () => files[0] } };
}

test("filter counts explain every excluded note once, including hidden notes", () => {
  const app = fixture(["Templates/t.md", "Projects/a.md", "Projects/b.md", "Other/c.md"]);
  const service = new GraphDataService(app);
  const config = structuredClone(DEFAULT_CONFIGURATION);
  config.discovery.excludeTemplates = true;
  config.graph.folderFilter = "Projects";
  config.interaction.hiddenNodeIds = ["Projects/b.md"];
  assert.deepEqual(service.getGraph(config).nodes.map((n) => n.path), ["Projects/a.md"]);
  assert.deepEqual(service.filterReport.map((step) => step.excluded), [1, 1, 1]);
  assert.equal(service.getGraph(structuredClone(DEFAULT_CONFIGURATION)).nodes.length, 4);
  assert.deepEqual(service.filterReport, []);
});

test("large vault retains all 10,000 orphan notes and returns recoverable empty results", () => {
  const service = new GraphDataService(fixture(Array.from({ length: 10000 }, (_, i) => `Notes/${i}.md`)));
  const config = structuredClone(DEFAULT_CONFIGURATION);
  assert.equal(service.getGraph(config).nodes.length, 10000);
  config.graph.minimumConnections = 1;
  assert.equal(service.getGraph(config).nodes.length, 0);
  assert.equal(service.filterReport[0].excluded, 10000);
});

test("failed graph loading reports an error and a subsequent refresh recovers", (t) => {
  const app = fixture(["a.md"]);
  const controller = new ConstellaController(app, {}, structuredClone(DEFAULT_SETTINGS), async () => {});
  const states = [];
  controller.events.on("graphStatus", (state) => states.push(state));
  const read = app.vault.getMarkdownFiles;
  app.vault.getMarkdownFiles = () => { throw new Error("Test read failure"); };
  t.mock.method(console, "error", () => {});
  controller.refreshGraph();
  assert.equal(controller.graphStatus, "error");
  app.vault.getMarkdownFiles = read;
  controller.refreshGraph();
  assert.deepEqual(states, ["loading", "error", "loading", "ready"]);
  assert.equal(controller.currentGraph.nodes.length, 1);
});

test("interaction preferences persist and show-all does not reset them", async () => {
  let saved;
  const controller = new ConstellaController(fixture(["a.md"]), {}, structuredClone(DEFAULT_SETTINGS), async (settings) => { saved = structuredClone(settings); });
  await controller.updateGraphInteraction("enabled", false);
  await controller.updateGraphInteraction("cameraPause", "temporary");
  await controller.updateQuickUi("showGraphInteraction", false);
  await controller.showAllNotes();
  assert.equal(saved.configuration.graphInteraction.enabled, false);
  assert.equal(saved.configuration.graphInteraction.cameraPause, "temporary");
  assert.equal(saved.configuration.quickUi.showGraphInteraction, false);
  const reloaded = new ConstellaController(fixture(["a.md"]), {}, saved, async () => {});
  assert.equal(reloaded.configuration.graphInteraction.enabled, false);
});
