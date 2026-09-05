import type { GraphData } from "../core/types";

export class ClusterEngine {
  assignClusters(graph: GraphData, iterations = 16): GraphData {
    if (graph.nodes.length === 0) {
      return graph;
    }

    const adjacency = new Map<string, Set<string>>();
    graph.nodes.forEach((node) => adjacency.set(node.id, new Set()));
    graph.edges.forEach((edge) => {
      adjacency.get(edge.source)?.add(edge.target);
      adjacency.get(edge.target)?.add(edge.source);
    });

    const labels = new Map<string, number>();
    graph.nodes.forEach((node, index) => labels.set(node.id, index));

    for (let pass = 0; pass < iterations; pass += 1) {
      let changed = false;
      const ordered = [...graph.nodes].sort((a, b) => this.hash(a.id, pass) - this.hash(b.id, pass));
      for (const node of ordered) {
        const counts = new Map<number, number>();
        adjacency.get(node.id)?.forEach((neighbor) => {
          const label = labels.get(neighbor);
          if (label !== undefined) {
            counts.set(label, (counts.get(label) ?? 0) + 1);
          }
        });

        let bestLabel = labels.get(node.id) ?? 0;
        let bestScore = -1;
        counts.forEach((score, label) => {
          if (score > bestScore || (score === bestScore && label < bestLabel)) {
            bestScore = score;
            bestLabel = label;
          }
        });

        if (labels.get(node.id) !== bestLabel) {
          labels.set(node.id, bestLabel);
          changed = true;
        }
      }
      if (!changed) {
        break;
      }
    }

    const compressed = new Map<number, number>();
    const sizes = new Map<number, number>();
    labels.forEach((label) => {
      if (!compressed.has(label)) {
        compressed.set(label, compressed.size);
      }
      const clusterId = compressed.get(label) ?? 0;
      sizes.set(clusterId, (sizes.get(clusterId) ?? 0) + 1);
    });

    return {
      nodes: graph.nodes.map((node) => {
        const clusterId = compressed.get(labels.get(node.id) ?? 0) ?? 0;
        return {
          ...node,
          clusterId,
          clusterSize: sizes.get(clusterId) ?? 1
        };
      }),
      edges: graph.edges
    };
  }

  private hash(input: string, seed: number): number {
    let hash = seed + 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
}
