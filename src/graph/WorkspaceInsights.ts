import type { GraphData, GraphNode } from "../core/types";

export function neighborIds(graph: GraphData, id: string): Set<string> {
  const ids = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.source === id) ids.add(edge.target);
    if (edge.target === id) ids.add(edge.source);
  }
  ids.delete(id);
  return ids;
}

export function relatedNotes(graph: GraphData, selected: GraphNode, tags: (node: GraphNode) => string[]) {
  const adjacency = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }
  const direct = adjacency.get(selected.id) ?? new Set<string>();
  const ownTags = new Set(tags(selected));
  const folder = selected.path.includes("/") ? selected.path.slice(0, selected.path.lastIndexOf("/")) : "";
  return graph.nodes.filter(node => node.id !== selected.id).map(node => {
    const sharedTags = tags(node).filter(tag => ownTags.has(tag));
    const sharedLinks = [...(adjacency.get(node.id) ?? [])].filter(id => direct.has(id)).length;
    const sameFolder = folder !== "" && node.path.includes("/") && node.path.slice(0, node.path.lastIndexOf("/")) === folder;
    const reasons = [direct.has(node.id) ? "Direct connection" : "", sharedTags.length ? `Shared tags: ${sharedTags.join(", ")}` : "", sharedLinks ? `${sharedLinks} shared neighbors` : "", sameFolder ? "Same folder" : ""].filter(Boolean);
    return { node, reasons, score: sharedTags.length * 4 + sharedLinks * 2 + (direct.has(node.id) ? 3 : 0) + (sameFolder ? 1 : 0) };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.node.path.localeCompare(b.node.path)).slice(0, 12);
}

export function compareConnections(graph: GraphData, left: string, right: string) {
  const a = neighborIds(graph, left), b = neighborIds(graph, right);
  return { shared: [...a].filter(id => b.has(id)), leftOnly: [...a].filter(id => !b.has(id)), rightOnly: [...b].filter(id => !a.has(id)) };
}
