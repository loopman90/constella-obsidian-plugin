import type { ActiveConfiguration, GraphData } from "../core/types";

export interface PerformanceBudget {
  particleScale: number;
  labelScale: number;
  warning: string | null;
}

export class PerformanceManager {
  budget(graph: GraphData, config: ActiveConfiguration): PerformanceBudget {
    const load = graph.nodes.length + graph.edges.length * 0.7;
    if (load > 6000) {
      return {
        particleScale: 0.15,
        labelScale: 0.2,
        warning: "Visual performance may be reduced. Large Vault settings are recommended."
      };
    }
    if (load > 2500) {
      return {
        particleScale: 0.4,
        labelScale: 0.45,
        warning: config.motion.particlesEnabled ? "Particles are limited for this vault size." : null
      };
    }
    return {
      particleScale: 1,
      labelScale: 1,
      warning: null
    };
  }
}

