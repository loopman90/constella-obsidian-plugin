import type { ActiveConfiguration, GraphData } from "../core/types";
import type { GraphAdapter } from "./GraphAdapter";
import { GraphDataService } from "./GraphDataService";

/**
 * Isolates any future native Obsidian Graph integration.
 *
 * Phase 1 intentionally avoids private graph internals and falls back to
 * metadataCache-based graph extraction. If undocumented APIs are introduced
 * later, they must remain contained in this file behind feature detection.
 */
export class NativeGraphAdapter implements GraphAdapter {
  readonly id = "native-fallback";
  readonly label = "Obsidian Metadata Graph";

  constructor(private readonly graphDataService: GraphDataService) {}

  isAvailable(): boolean {
    return true;
  }

  read(config: ActiveConfiguration): GraphData {
    return this.graphDataService.getGraph(config);
  }
}

