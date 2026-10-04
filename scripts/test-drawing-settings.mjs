import { build } from "esbuild";
import assert from "node:assert/strict";
import { test } from "node:test";

const { outputFiles } = await build({
  stdin: { contents: `export { ConstellaSettingsTab } from './src/settings/ConstellaSettingsTab'; export { DEFAULT_CONFIGURATION } from './src/core/ActiveConfiguration';`, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node",
  plugins: [{ name: "obsidian-test", setup(builder) {
    builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "stub" }));
    builder.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export class PluginSettingTab { refreshDomState() {} }" }));
  } }]
});
const { ConstellaSettingsTab, DEFAULT_CONFIGURATION } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);

test("drawing settings expose every style alphabetically and update the live configuration", async () => {
  const configuration = structuredClone(DEFAULT_CONFIGURATION);
  const calls = [];
  const plugin = { app: {}, settings: { configuration }, async setDrawingLineOption(key, value) {
    calls.push([key, value]); configuration.motion[key] = value;
  } };
  const tab = new ConstellaSettingsTab(plugin);
  const group = tab.getSettingDefinitions().find(item => item.heading === "Drawing lines");
  assert.equal(group.items.length, 3);
  const labels = Object.values(group.items[1].control.options);
  assert.equal(labels.length, 11);
  assert.deepEqual(labels, [...labels].sort((a, b) => a.localeCompare(b)));
  await tab.setControlValue("drawingLinesEnabled", true);
  await tab.setControlValue("drawingLineStyle", "city-lights");
  await tab.setControlValue("drawingLineSpeed", 5);
  assert.equal(tab.getControlValue("drawingLinesEnabled"), true);
  assert.equal(tab.getControlValue("drawingLineStyle"), "city-lights");
  assert.equal(tab.getControlValue("drawingLineSpeed"), 1);
  const count = calls.length;
  await tab.setControlValue("drawingLineStyle", "invalid");
  await tab.setControlValue("drawingLineSpeed", NaN);
  await tab.setControlValue("drawingLinesEnabled", "true");
  assert.equal(calls.length, count);
});

test("labels and legend are discoverable and their settings update the live display", async () => {
  const configuration = structuredClone(DEFAULT_CONFIGURATION);
  const calls = [];
  const plugin = { app: {}, settings: { configuration }, async setLabelLegendOption(key, value) {
    calls.push([key, value]); configuration.display[key] = value;
  } };
  const tab = new ConstellaSettingsTab(plugin);
  const controls = tab.getSettingDefinitions().flatMap(group => group.items).map(item => item.control);
  for (const key of ["showLabels", "showLegend", "labelSize"]) {
    const control = controls.find(control => control.key === key);
    assert(control, key);
    assert.equal(control.defaultValue, DEFAULT_CONFIGURATION.display[key]);
  }
  await tab.setControlValue("showLabels", false);
  await tab.setControlValue("showLegend", false);
  await tab.setControlValue("labelSize", 2);
  assert.equal(tab.getControlValue("showLabels"), false);
  assert.equal(tab.getControlValue("showLegend"), false);
  assert.equal(tab.getControlValue("labelSize"), 1);
  const count = calls.length;
  await tab.setControlValue("labelSize", Infinity);
  await tab.setControlValue("showLegend", "true");
  assert.equal(calls.length, count);
});
