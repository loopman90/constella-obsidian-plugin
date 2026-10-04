import { forceSimulation, forceManyBody, forceLink, forceCollide, forceX, forceY } from "d3-force";
import type { Simulation, SimulationNodeDatum } from "d3-force";
import type { ActiveConfiguration, GraphData, GraphNode } from "../core/types";

interface LayoutNode extends SimulationNodeDatum { id: string; note: GraphNode; }

export class GraphLayoutEngine {
  private simulation: Simulation<LayoutNode, undefined> | null = null;
  private nodes: LayoutNode[] = [];

  configure(graph: GraphData, config: ActiveConfiguration, reseed: boolean): void {
    this.destroy();
    if (config.graph.layout === "circle" || !graph.nodes.length) return;
    const spacing = Math.max(20, Math.min(200, config.graph.nodeSpacing));
    const distance = Math.max(40, Math.min(500, config.graph.linkDistance));
    const pinned = new Set(config.interaction.pinnedNodeIds);
    this.nodes = graph.nodes.map(note => ({ id: note.id, note,
      x: reseed && !pinned.has(note.id) ? undefined : note.x,
      y: reseed && !pinned.has(note.id) ? undefined : note.y
    }));
    const simulation = forceSimulation(this.nodes).stop();
    if (reseed) for (const node of this.nodes) {
      if (!pinned.has(node.id)) { node.x! *= spacing / 10; node.y! *= spacing / 10; }
      node.note.x = node.x!; node.note.y = node.y!;
    }
    // D3 mutates link endpoints, so keep the graph's edges separate.
    const links = graph.edges.filter(edge => edge.source !== edge.target).map(edge => ({ source: edge.source, target: edge.target }));
    simulation.force("charge", forceManyBody<LayoutNode>().strength(-spacing * spacing * 0.35).distanceMax(spacing * 16))
      .force("links", forceLink<LayoutNode, typeof links[number]>(links).id(node => node.id).distance(distance).strength(0.12))
      .force("collision", forceCollide<LayoutNode>().radius(node => Math.max(spacing / 2, node.note.radius + 8)))
      .force("x", forceX<LayoutNode>(0).strength(0.002))
      .force("y", forceY<LayoutNode>(0).strength(0.002))
      .alphaDecay(0.035).velocityDecay(0.5);
    this.simulation = simulation;
  }

  step(pinnedIds: string[], dragged: GraphNode | null): boolean {
    if (!this.simulation || this.simulation.alpha() < this.simulation.alphaMin()) return false;
    const pinned = new Set(pinnedIds);
    for (const node of this.nodes) {
      node.x = node.note.x; node.y = node.note.y;
      const fixed = pinned.has(node.id) || dragged?.id === node.id;
      node.fx = fixed ? node.note.x : null; node.fy = fixed ? node.note.y : null;
    }
    this.simulation.tick();
    for (const node of this.nodes) { node.note.x = node.x!; node.note.y = node.y!; }
    return true;
  }

  reheat(): void { this.simulation?.alpha(0.4); }

  destroy(): void { this.simulation?.stop(); this.simulation = null; this.nodes = []; }
}
