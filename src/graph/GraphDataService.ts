import type { App, TFile } from "obsidian";
import { cloneConfiguration, DEFAULT_CONFIGURATION } from "../core/ActiveConfiguration";
import type { ActiveConfiguration, GraphData, GraphEdge, GraphNode } from "../core/types";
import { ClusterEngine } from "../discovery/ClusterEngine";

export class GraphDataService {
  private readonly clusterEngine = new ClusterEngine();

  constructor(private readonly app: App) {}

  getGraph(config: ActiveConfiguration): GraphData {
    const global = this.clusterEngine.assignClusters(this.getGlobalGraph(config));
    const { scope, localDepth } = config.graph;
    let graph = global;
    if (scope === "global") {
      return this.applyInteractionFilters(graph, config);
    }

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      return this.applyInteractionFilters(graph, config);
    }

    const depth = scope === "current" ? 0 : Math.max(1, Math.min(50, Math.round(localDepth ?? 4)));
    graph = this.clusterEngine.assignClusters(this.filterAroundFile(global, activeFile, depth));
    return this.applyInteractionFilters(graph, config);
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

    const minimumConnections = config.graph.minimumConnections ?? 0;
    const nodes = files
      .map((file, index) => this.createNode(file, index, files.length, connectionCounts.get(file.path) ?? 0))
      .filter((node) => node.connectionCount >= minimumConnections);
    const nodeIds = new Set(nodes.map((node) => node.id));
    return {
      nodes,
      edges: Array.from(edgeMap.values()).filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
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
    if (!this.matchesFolderFilter(file, config.graph.folderFilter)) {
      return false;
    }
    if (!this.matchesTagFilter(file, config.graph.tagFilter)) {
      return false;
    }
    if (!this.matchesDateFilter(file, config)) {
      return false;
    }
    return true;
  }

  private matchesFolderFilter(file: TFile, filter: string | undefined): boolean {
    const tokens = this.filterTokens(filter);
    if (tokens.length === 0) {
      return true;
    }
    const path = file.path.toLowerCase();
    return tokens.some((token) => path.includes(token));
  }

  private matchesTagFilter(file: TFile, filter: string | undefined): boolean {
    const tokens = this.filterTokens(filter).map((token) => token.replace(/^#/, ""));
    if (tokens.length === 0) {
      return true;
    }

    const cache = this.app.metadataCache.getFileCache(file);
    const tags = new Set<string>();
    cache?.tags?.forEach((tag) => tags.add(tag.tag.replace(/^#/, "").toLowerCase()));

    const frontmatter = cache?.frontmatter as Record<string, unknown> | undefined;
    const frontmatterTags = frontmatter?.tags;
    if (typeof frontmatterTags === "string") {
      this.filterTokens(frontmatterTags).forEach((tag) => tags.add(tag.replace(/^#/, "")));
    } else if (Array.isArray(frontmatterTags)) {
      frontmatterTags.forEach((tag) => {
        if (typeof tag === "string") {
          tags.add(tag.replace(/^#/, "").toLowerCase());
        }
      });
    }

    return tokens.some((token) => tags.has(token) || Array.from(tags).some((tag) => tag.startsWith(`${token}/`)));
  }

  private matchesDateFilter(file: TFile, config: ActiveConfiguration): boolean {
    const dateFilter = config.graph.dateFilter ?? "all";
    if (dateFilter === "all") {
      return true;
    }
    const ageMs = Date.now() - file.stat.mtime;
    if (dateFilter === "recent") {
      return ageMs <= config.discovery.recentDays * 86400000;
    }
    return ageMs >= config.discovery.forgottenDays * 86400000;
  }

  private filterTokens(value: string | undefined): string[] {
    return (value ?? "")
      .split(/[,;\n]/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
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

  private applyInteractionFilters(graph: GraphData, config: ActiveConfiguration): GraphData {
    let included = new Set(graph.nodes.map((node) => node.id));
    const interaction = config.interaction ?? cloneConfiguration(DEFAULT_CONFIGURATION).interaction;
    interaction.hiddenNodeIds.forEach((id) => included.delete(id));
    graph.nodes
      .filter((node) => interaction.hiddenClusterIds.includes(node.clusterId))
      .forEach((node) => included.delete(node.id));

    if (interaction.expandFromNodeId && included.has(interaction.expandFromNodeId)) {
      const expanded = new Set<string>([interaction.expandFromNodeId]);
      graph.edges.forEach((edge) => {
        if (edge.source === interaction.expandFromNodeId && included.has(edge.target)) {
          expanded.add(edge.target);
        }
        if (edge.target === interaction.expandFromNodeId && included.has(edge.source)) {
          expanded.add(edge.source);
        }
      });
      included = expanded;
    }

    return {
      nodes: graph.nodes.filter((node) => included.has(node.id)),
      edges: graph.edges.filter((edge) => included.has(edge.source) && included.has(edge.target))
    };
  }
}
