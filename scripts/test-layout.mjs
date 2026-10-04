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
