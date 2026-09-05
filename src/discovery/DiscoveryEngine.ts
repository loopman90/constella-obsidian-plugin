import type { ActiveConfiguration, GraphData, GraphNode } from "../core/types";

export interface DiscoverySummary {
  recent: GraphNode[];
  forgotten: GraphNode[];
  hubs: GraphNode[];
  hiddenGems: GraphNode[];
}

export class DiscoveryEngine {
  summarize(graph: GraphData, config: ActiveConfiguration): DiscoverySummary {
    const now = Date.now();
    const recentCutoff = now - config.discovery.recentDays * 24 * 60 * 60 * 1000;
    const forgottenCutoff = now - config.discovery.forgottenDays * 24 * 60 * 60 * 1000;
    const eligible = graph.nodes.filter((node) => config.discovery.includeOrphans || node.connectionCount > 0);

    return {
      recent: eligible.filter((node) => node.lastModified >= recentCutoff).sort((a, b) => b.lastModified - a.lastModified).slice(0, 12),
      forgotten: eligible.filter((node) => node.lastModified <= forgottenCutoff).sort((a, b) => a.lastModified - b.lastModified).slice(0, 12),
      hubs: [...eligible].sort((a, b) => b.connectionCount - a.connectionCount).slice(0, 12),
      hiddenGems: [...eligible].sort((a, b) => this.hiddenGemScore(b) - this.hiddenGemScore(a)).slice(0, 12)
    };
  }

  private hiddenGemScore(node: GraphNode): number {
    const ageDays = Math.max(1, (Date.now() - node.lastModified) / (24 * 60 * 60 * 1000));
    return Math.log(ageDays + 1) * Math.max(1, node.connectionCount + 1) / Math.max(1, Math.pow(node.connectionCount + 1, 0.8));
  }
}

