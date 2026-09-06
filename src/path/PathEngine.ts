import type { ActiveConfiguration, GraphData, GraphNode, JourneyState, ModeId } from "../core/types";

export class PathEngine {
  private readonly recentHistory: string[] = [];

  createJourney(graph: GraphData, config: ActiveConfiguration, startNode?: GraphNode | null): JourneyState | null {
    if (graph.nodes.length === 0) {
      return null;
    }

    const start = startNode ?? this.selectStartNode(graph, config.mode, config);
    if (!start) {
      return null;
    }

    const path = this.walk(graph, start.id, config);
    return {
      path,
      currentIndex: 0,
      startedAt: Date.now(),
      nextStepAt: Date.now() + config.journey.nodePauseSeconds * 1000
    };
  }

  advance(journey: JourneyState, graph: GraphData, config: ActiveConfiguration): JourneyState | null {
    if (Date.now() < journey.nextStepAt) {
      return journey;
    }

    const nextIndex = journey.currentIndex + 1;
    if (nextIndex < journey.path.length) {
      this.remember(journey.path[nextIndex]);
      return {
        ...journey,
        currentIndex: nextIndex,
        nextStepAt: Date.now() + config.journey.nodePauseSeconds * 1000
      };
    }

    if (config.journey.afterJourney === "start-new-journey") {
      const current = graph.nodes.find((node) => node.id === journey.path[journey.currentIndex]);
      return this.createJourney(graph, config, current);
    }

    return null;
  }

  selectStartNode(graph: GraphData, mode: ModeId, config: ActiveConfiguration): GraphNode | null {
    const candidates = this.filteredNodes(graph, config);
    if (candidates.length === 0) {
      return graph.nodes[0] ?? null;
    }

    switch (mode) {
      case "recent-activity":
      case "newest-first":
      case "timeline-run":
      case "daily-reflection":
        return [...candidates].sort((a, b) => b.lastModified - a.lastModified)[0];
      case "forgotten-knowledge":
      case "oldest-first":
      case "memory-lane":
      case "deep-archive":
        return [...candidates].sort((a, b) => a.lastModified - b.lastModified)[0];
      case "hub-explorer":
      case "dense-route":
      case "bridge-finder":
      case "bridge-notes":
      case "project-map":
        return [...candidates].sort((a, b) => b.connectionCount - a.connectionCount)[0];
      case "hidden-gems":
      case "sparse-route":
      case "orphan-hunt":
      case "orphan-rescue":
        return [...candidates].sort((a, b) => this.hiddenGemScore(b) - this.hiddenGemScore(a))[0];
      case "quick-scan":
      case "review-loop":
      case "review-queue":
        return candidates[Math.floor(Math.random() * Math.min(candidates.length, Math.max(1, Math.ceil(candidates.length * 0.35))))];
      case "random-discovery":
      case "cluster-journey":
      case "path-journey":
      case "deep-dive":
      case "idea-hop":
      case "cluster-sweep":
      case "balanced-tour":
      case "serendipity":
      case "research-trail":
      case "writing-map":
      case "writing-flow":
      case "tag-surf":
      case "tag-drift":
      case "folder-walk":
      case "cluster-compare":
      case "wander":
      default:
        return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  private walk(graph: GraphData, startId: string, config: ActiveConfiguration): string[] {
    const adjacency = this.buildAdjacency(graph);
    const length = this.randomInt(config.journey.minNodes, config.journey.maxNodes);
    const path = [startId];
    let current = startId;

    while (path.length < length) {
      const neighbors = [...(adjacency.get(current) ?? [])].filter((id) => {
        if (!config.journey.avoidRecentlyVisited) {
          return true;
        }
        return !this.recentHistory.includes(id) || path.length > Math.max(2, config.journey.minNodes / 2);
      });

      if (neighbors.length === 0) {
        if (config.journey.deadEndBehavior === "stop") {
          break;
        }
        if (config.journey.deadEndBehavior === "new-start") {
          const next = graph.nodes[Math.floor(Math.random() * graph.nodes.length)];
          current = next.id;
          path.push(current);
          continue;
        }
        const jump = graph.nodes[Math.floor(Math.random() * graph.nodes.length)];
        current = jump.id;
        path.push(current);
        continue;
      }

      current = this.weightedPick(neighbors, graph, config.mode);
      path.push(current);
    }

    path.forEach((id) => this.remember(id));
    return path;
  }

  private filteredNodes(graph: GraphData, config: ActiveConfiguration): GraphNode[] {
    const now = Date.now();
    return graph.nodes.filter((node) => {
      if (!config.discovery.includeOrphans && node.connectionCount === 0) {
        return false;
      }
      if (node.connectionCount < config.discovery.minimumConnections) {
        return false;
      }
      if (config.mode === "recent-activity") {
        return node.lastModified >= now - config.discovery.recentDays * 24 * 60 * 60 * 1000;
      }
      if (config.mode === "newest-first" || config.mode === "timeline-run" || config.mode === "quick-scan" || config.mode === "daily-reflection") {
        return node.lastModified >= now - Math.max(config.discovery.recentDays, 60) * 24 * 60 * 60 * 1000;
      }
      if (config.mode === "forgotten-knowledge") {
        return node.lastModified <= now - config.discovery.forgottenDays * 24 * 60 * 60 * 1000;
      }
      if (
        config.mode === "oldest-first" ||
        config.mode === "memory-lane" ||
        config.mode === "review-loop" ||
        config.mode === "review-queue" ||
        config.mode === "deep-archive"
      ) {
        return node.lastModified <= now - Math.max(30, Math.floor(config.discovery.forgottenDays / 2)) * 24 * 60 * 60 * 1000;
      }
      if (config.mode === "orphan-hunt" || config.mode === "orphan-rescue") {
        return node.connectionCount === 0;
      }
      return true;
    });
  }

  private weightedPick(ids: string[], graph: GraphData, mode: ModeId): string {
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const weights = ids.map((id) => {
      const node = nodeById.get(id);
      if (!node) {
        return 1;
      }
      if (mode === "hub-explorer") {
        return Math.max(1, node.connectionCount);
      }
      if (mode === "dense-route" || mode === "project-map" || mode === "bridge-finder" || mode === "bridge-notes") {
        return Math.max(1, node.connectionCount * 1.35);
      }
      if (mode === "hidden-gems") {
        return this.hiddenGemScore(node);
      }
      if (mode === "sparse-route" || mode === "orphan-hunt" || mode === "orphan-rescue") {
        return Math.max(1, 12 - node.connectionCount);
      }
      if (mode === "forgotten-knowledge") {
        return Math.max(1, (Date.now() - node.lastModified) / (24 * 60 * 60 * 1000));
      }
      if (mode === "oldest-first" || mode === "memory-lane" || mode === "review-loop" || mode === "review-queue" || mode === "deep-archive") {
        return Math.max(1, Math.sqrt((Date.now() - node.lastModified) / (24 * 60 * 60 * 1000)));
      }
      if (mode === "recent-activity" || mode === "daily-reflection") {
        return Math.max(1, 100 - (Date.now() - node.lastModified) / (24 * 60 * 60 * 1000));
      }
      if (mode === "newest-first" || mode === "timeline-run" || mode === "quick-scan") {
        return Math.max(1, 160 - (Date.now() - node.lastModified) / (24 * 60 * 60 * 1000));
      }
      if (mode === "serendipity" || mode === "idea-hop") {
        return 1 + Math.random() * Math.max(1, node.connectionCount + 4);
      }
      if (
        mode === "balanced-tour" ||
        mode === "research-trail" ||
        mode === "writing-map" ||
        mode === "writing-flow" ||
        mode === "tag-surf" ||
        mode === "tag-drift" ||
        mode === "folder-walk"
      ) {
        return 2 + Math.sqrt(node.connectionCount + 1);
      }
      if (mode === "deep-dive" || mode === "cluster-sweep" || mode === "cluster-compare") {
        return 1 + node.connectionCount;
      }
      return 1 + Math.sqrt(node.connectionCount);
    });
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let cursor = Math.random() * total;
    for (let index = 0; index < ids.length; index += 1) {
      cursor -= weights[index];
      if (cursor <= 0) {
        return ids[index];
      }
    }
    return ids[0];
  }

  private buildAdjacency(graph: GraphData): Map<string, Set<string>> {
    const adjacency = new Map<string, Set<string>>();
    graph.edges.forEach((edge) => {
      this.add(adjacency, edge.source, edge.target);
      this.add(adjacency, edge.target, edge.source);
    });
    return adjacency;
  }

  private add(adjacency: Map<string, Set<string>>, source: string, target: string): void {
    const set = adjacency.get(source) ?? new Set<string>();
    set.add(target);
    adjacency.set(source, set);
  }

  private hiddenGemScore(node: GraphNode): number {
    return Math.max(1, Math.min(8, node.connectionCount)) / Math.max(1, Math.sqrt(node.connectionCount + 1));
  }

  private remember(id: string): void {
    this.recentHistory.push(id);
    if (this.recentHistory.length > 80) {
      this.recentHistory.shift();
    }
  }

  private randomInt(min: number, max: number): number {
    const lower = Math.max(1, Math.min(min, max));
    const upper = Math.max(lower, max);
    return Math.floor(lower + Math.random() * (upper - lower + 1));
  }
}
