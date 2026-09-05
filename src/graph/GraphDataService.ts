import type { App, TFile } from "obsidian";
import type { ActiveConfiguration, GraphData, GraphEdge, GraphNode } from "../core/types";
import { ClusterEngine } from "../discovery/ClusterEngine";

export class GraphDataService {
  private readonly clusterEngine = new ClusterEngine();

  constructor(private readonly app: App) {}

  getGraph(config: ActiveConfiguration): GraphData {
    const global = this.getGlobalGraph(config);
    const { scope, localDepth } = config.graph;
    if (scope === "global") {
      return this.clusterEngine.assignClusters(global);
    }

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      return global;
    }

    const depth = scope === "current" ? 0 : localDepth;
    return this.clusterEngine.assignClusters(this.filterAroundFile(global, activeFile, depth));
  }

  getGlobalGraph(config: ActiveConfiguration): GraphData {
    const files = this.app.vault.getMarkdownFiles().filter((file) => this.includeFile(file, config));
    const fileByPath = new Map(files.map((file) => [file.path, file]));
    const connectionCounts = new Map<string, number>();
    const edgeMap = new Map<string, GraphEdge>();
    const resolvedLinks = this.app.metadataCache.resolvedLinks;

    for (const [source, targets] of Object.entries(resolvedLinks)) {
      if (!fileByPath.has(source)) {
        continue;
      }

      for (const [target, weight] of Object.entries(targets)) {
        if (!fileByPath.has(target)) {
          continue;
        }

        const id = `${source}->${target}`;
        edgeMap.set(id, { id, source, target, weight });
        connectionCounts.set(source, (connectionCounts.get(source) ?? 0) + weight);
        connectionCounts.set(target, (connectionCounts.get(target) ?? 0) + weight);
      }
    }

    const nodes = files.map((file, index) => this.createNode(file, index, files.length, connectionCounts.get(file.path) ?? 0));
    return {
      nodes,
      edges: Array.from(edgeMap.values())
    };
  }

  private createNode(file: TFile, index: number, total: number, connectionCount: number): GraphNode {
    const ring = Math.max(80, Math.sqrt(total) * 38);
    const angle = (index / Math.max(1, total)) * Math.PI * 2;
    const radius = ring * (0.45 + (index % 7) * 0.075);

    return {
      id: file.path,
      path: file.path,
      title: file.basename,
      file,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      radius: Math.max(4, Math.min(13, 4 + Math.sqrt(connectionCount + 1))),
      connectionCount,
      lastModified: file.stat.mtime,
      clusterId: 0,
      clusterSize: 1
    };
  }

  private includeFile(file: TFile, config: ActiveConfiguration): boolean {
    if (config.discovery.excludeTemplates && /(^|\/)templates?\//i.test(file.path)) {
      return false;
    }
    if (config.discovery.excludeDailyNotes && /(^|\/)(daily|journal|log)s?\//i.test(file.path)) {
      return false;
    }
    return true;
  }

  private filterAroundFile(graph: GraphData, file: TFile, depth: number): GraphData {
    const adjacency = new Map<string, Set<string>>();

    for (const edge of graph.edges) {
      this.addAdjacent(adjacency, edge.source, edge.target);
      this.addAdjacent(adjacency, edge.target, edge.source);
    }

    const included = new Set<string>([file.path]);
    let frontier = new Set<string>([file.path]);

    for (let step = 0; step < depth; step += 1) {
      const next = new Set<string>();
      for (const nodeId of frontier) {
        adjacency.get(nodeId)?.forEach((neighbor) => {
          if (!included.has(neighbor)) {
            included.add(neighbor);
            next.add(neighbor);
          }
        });
      }
      frontier = next;
      if (frontier.size === 0) {
        break;
      }
    }

    return {
      nodes: graph.nodes.filter((node) => included.has(node.id)),
      edges: graph.edges.filter((edge) => included.has(edge.source) && included.has(edge.target))
    };
  }

  private addAdjacent(adjacency: Map<string, Set<string>>, source: string, target: string): void {
    const neighbors = adjacency.get(source) ?? new Set<string>();
    neighbors.add(target);
    adjacency.set(source, neighbors);
  }
}
