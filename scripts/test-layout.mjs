import { build } from "esbuild";
import assert from "node:assert/strict";
import { test } from "node:test";

const { outputFiles } = await build({ stdin: { contents: `export { GraphLayoutEngine } from './src/graph/GraphLayoutEngine'; export { DEFAULT_CONFIGURATION } from './src/core/ActiveConfiguration'; export { ConstellaGraphRenderer } from './src/graph/ConstellaGraphRenderer'; export { DRAWING_LINE_STYLES } from './src/core/types';`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node" });
const { GraphLayoutEngine, DEFAULT_CONFIGURATION, ConstellaGraphRenderer, DRAWING_LINE_STYLES } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString("base64")}`);
function graph(count) { return { nodes: Array.from({length:count}, (_, i) => ({id:String(i), x:100, y:100, radius:5, vx:0, vy:0})), edges: Array.from({length:Math.max(0,count-1)},(_,i)=>({id:String(i),source:String(i),target:String(i+1),weight:1})) }; }

test("force layout separates coincident nodes, preserves edges and cools to a stop", () => {
  const data=graph(30), before=structuredClone(data.edges), engine=new GraphLayoutEngine();
  engine.configure(data,structuredClone(DEFAULT_CONFIGURATION),true);
  let ticks=0; while(engine.step([],null)) { ticks++; assert(ticks<250); }
  assert(new Set(data.nodes.map(node=>`${Math.round(node.x)},${Math.round(node.y)}`)).size>25);
  assert(data.nodes.every(node=>Number.isFinite(node.x)&&Number.isFinite(node.y)));
  assert.deepEqual(data.edges,before); engine.destroy();
});

test("pinned nodes and dragged nodes retain exact positions during force ticks", () => {
  const data=graph(10), config=structuredClone(DEFAULT_CONFIGURATION); config.interaction.pinnedNodeIds=['0'];
  const engine=new GraphLayoutEngine();engine.configure(data,config,true);
  data.nodes[1].x=777;data.nodes[1].y=-333;
  for(let i=0;i<10;i++) engine.step(['0'],data.nodes[1]);
  assert.equal(data.nodes[0].x,100);assert.equal(data.nodes[0].y,100);
  assert.equal(data.nodes[1].x,777);assert.equal(data.nodes[1].y,-333);engine.destroy();
});

test("circle bypasses force settling and orphan-heavy large graphs retain every node", () => {
  const engine=new GraphLayoutEngine(), config=structuredClone(DEFAULT_CONFIGURATION), data=graph(10000);data.edges=[];
  engine.configure(data,config,true);engine.step([],null);
  assert.equal(data.nodes.length,10000);assert(data.nodes.every(node=>Number.isFinite(node.x)&&Number.isFinite(node.y)));
  config.graph.layout='circle';const before=data.nodes[0].x;engine.configure(data,config,false);assert.equal(engine.step([],null),false);assert.equal(data.nodes[0].x,before);engine.destroy();
});

test("renderer preserves existing positions and viewport across ordinary refresh", () => {
  const renderer=Object.create(ConstellaGraphRenderer.prototype), old=graph(2), refreshed=graph(2);
  renderer.config=structuredClone(DEFAULT_CONFIGURATION);renderer.nodeById=new Map(old.nodes.map(node=>[node.id,node]));renderer.graph=old;
  renderer.layoutKey='force-directed:60:140';renderer.layoutEngine=new GraphLayoutEngine();renderer.cancelPointer=()=>{};renderer.options={onNodeSelected(){}};
  renderer.hasCenteredGraph=true;renderer.viewport={x:123,y:234,scale:0.7};renderer.selectedNode=null;
  old.nodes[0].x=876;old.nodes[0].y=-654;
  renderer.setGraph(refreshed);
  assert.equal(refreshed.nodes[0].x,876);assert.equal(refreshed.nodes[0].y,-654);
  assert.deepEqual(renderer.viewport,{x:123,y:234,scale:0.7});renderer.layoutEngine.destroy();
});

test("all 11 drawing-line styles render with changing progress and can be disabled", () => {
  const renderer = Object.create(ConstellaGraphRenderer.prototype);
  renderer.config = structuredClone(DEFAULT_CONFIGURATION);
  renderer.config.motion.drawingLinesEnabled = true;
  renderer.viewport = { x: 0, y: 0, scale: 1 };
  let strokes = 0;
  renderer.ctx = new Proxy({ globalAlpha: 1, stroke() { strokes++; } }, {
    get(target, key) { return key in target ? target[key] : () => {}; }
  });
  // Isolate line geometry from the separately tested pulse renderer.
  renderer.drawPulseShape = () => {};
  const [source, target] = graph(2).nodes;
  target.x = 300;
  assert.equal(DRAWING_LINE_STYLES.length, 11);
  for (const style of DRAWING_LINE_STYLES) {
    renderer.config.motion.drawingLineStyle = style.id;
    renderer.time = 0;
    const first = renderer.getLineDrawProgress("edge", false);
    renderer.time = 0.3;
    const next = renderer.getLineDrawProgress("edge", false);
    assert.notEqual(first, next, style.id);
    const before = strokes;
    renderer.drawDrawingLine(source, target, renderer.pointOnEdge(source, target, next), "edge", "#71d7d1", "line", next);
    assert(strokes > before, style.id);
  }
  renderer.config.motion.drawingLinesEnabled = false;
  assert.equal(renderer.getLineDrawProgress("edge", false), 1);
});

function motionFixture(strength, scale = 1, intensity = 1) {
  const renderer = Object.create(ConstellaGraphRenderer.prototype);
  renderer.config = structuredClone(DEFAULT_CONFIGURATION);
  Object.assign(renderer.config.motion, { nodeMovementEnabled: true, nodeMovementStyle: "orbit", nodeMovementStrength: strength, visualIntensity: intensity });
  renderer.viewport = { x: 0, y: 0, scale };
  renderer.graph = graph(2);
  renderer.time = 1;
  renderer.performanceManager = { budget: () => ({ motionScale: 1 }) };
  return renderer;
}

test("motion has an expressive range, ignores visual intensity and compensates zoom within bounds", () => {
  const displacement = renderer => {
    const node = renderer.graph.nodes[0], x = node.x, y = node.y;
    renderer.step(1 / 60);
    return Math.hypot(node.x - x, node.y - y);
  };
  const gentle = displacement(motionFixture(0.35));
  const strong = displacement(motionFixture(1));
  assert(strong > gentle * 8);
  assert.equal(displacement(motionFixture(0)), 0);
  const stopped = motionFixture(0);
  stopped.config.motion.nodeMovementStyle = "drift";
  stopped.graph.nodes[0].vx = 10;
  assert.equal(displacement(stopped), 0);
  assert.equal(displacement(motionFixture(0.35, 1, 0)), gentle);
  assert(Math.abs(displacement(motionFixture(0.35, 0.02)) - gentle * 3) < 1e-9);
});

test("orbit respects elapsed time and pinned or dragged notes do not move", () => {
  const full = motionFixture(1), half = motionFixture(1);
  full.step(1 / 30);
  half.step(1 / 60); half.step(1 / 60);
  assert(Math.abs(full.graph.nodes[0].x - half.graph.nodes[0].x) < 1e-9);
  assert(Math.abs(full.graph.nodes[0].y - half.graph.nodes[0].y) < 1e-9);
  const fixed = motionFixture(1);
  fixed.config.interaction.pinnedNodeIds = ["0"];
  fixed.draggedNode = fixed.graph.nodes[1];
  fixed.step(1 / 60);
  assert(fixed.graph.nodes.every(node => node.x === 100 && node.y === 100));
});

test("glow draws outside nodes at low intensity and zoom, scales with strength, and switches off", () => {
  const renderer = motionFixture(0.35);
  renderer.graph.nodes = [renderer.graph.nodes[0]];
  renderer.config.motion.visualIntensity = 0;
  renderer.config.motion.glowStrength = 0.1;
  renderer.viewport.scale = 0.1;
  renderer.journeyPath = []; renderer.hoverNeighborIds = new Set();
  renderer.getPalette = () => ({ node: "#71d7d1", nodeRecent: "#71d7d1" });
  renderer.visualProfile = () => ({ nodeMultiplier: 1, glowMultiplier: 0, nodeShape: "circle" });
  renderer.focusFactor = renderer.clusterBloomFactor = () => 1;
  renderer.dynamicNodeColor = () => null;
  renderer.nodeDepthFactor = () => ({ radius: 1, alpha: 1 });
  renderer.nodeRadius = () => 5;
  renderer.shouldDrawLabel = () => false;
  renderer.drawVisualNode = () => {};
  renderer.performanceManager = { budget: () => ({ glowScale: 0.35 }) };
  const radii = [], alphas = [];
  renderer.ctx = {
    createRadialGradient(x, y, inner, endX, endY, outer) { radii.push(outer); return { addColorStop() {} }; },
    beginPath() {}, arc() {}, fill() { alphas.push(this.globalAlpha); }
  };
  renderer.drawNodes();
  assert(radii[0] > 5);
  renderer.config.motion.glowStrength = 1;
  renderer.drawNodes();
  assert(radii[1] > radii[0]); assert(alphas[1] > alphas[0]);
  renderer.config.motion.glowEnabled = false;
  renderer.drawNodes();
  renderer.config.motion.glowEnabled = true;
  renderer.config.motion.glowStrength = 0;
  renderer.drawNodes();
  assert.equal(radii.length, 2);
});

test("enabled labels show while zoomed out, density remains optional, and disabling hides all labels", () => {
  const renderer = motionFixture(0.35, 0.02), node = renderer.graph.nodes[0];
  renderer.config.display.showLabels = true;
  renderer.config.display.densityMode = false;
  assert.equal(renderer.shouldDrawLabel(node, false, false, 1), true);
  renderer.config.display.densityMode = true;
  assert.equal(renderer.shouldDrawLabel(node, false, false, 1), false);
  assert.equal(renderer.shouldDrawLabel(node, true, false, 1), true);
  assert.equal(renderer.shouldDrawLabel(node, false, true, 1), true);
  renderer.config.display.showLabels = false;
  assert.equal(renderer.shouldDrawLabel(node, true, true, 1), false);
});

test("label text uses screen-size coordinates and a valid canvas font", () => {
  const renderer = motionFixture(0.35, 0.1), node = renderer.graph.nodes[0];
  node.title = "Research note";
  renderer.nodeRadius = () => 5;
  const calls = [];
  renderer.ctx = {
    save() {}, restore() {}, translate(...args) { calls.push(["translate", ...args]); },
    scale(...args) { calls.push(["scale", ...args]); }, fillText(...args) { calls.push(["text", ...args]); }
  };
  renderer.drawLabel(node, "#fff", false);
  assert.deepEqual(calls, [["translate", 100, 155], ["scale", 10, 10], ["text", "Research note", 0, 0, 180]]);
  assert.match(renderer.ctx.font, /^[\d.]+px sans-serif$/);
});
