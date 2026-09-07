import type { ActiveConfiguration, GraphData } from "../core/types";

export interface PerformanceBudget {
  particleScale: number;
  labelScale: number;
  edgeScale: number;
  glowScale: number;
  motionScale: number;
  warning: string | null;
}

export class PerformanceManager {
  budget(graph: GraphData, config: ActiveConfiguration): PerformanceBudget {
    const load = graph.nodes.length + graph.edges.length * 0.7;
    if (load > 6000) {
      return {
        particleScale: 0.15,
        labelScale: 0.2,
        edgeScale: 0.48,
        glowScale: 0.35,
        motionScale: 0.45,
        warning: "Visual performance may be reduced. Large Vault settings are recommended."
      };
    }
    if (load > 2500) {
      return {
        particleScale: 0.4,
        labelScale: 0.45,
        edgeScale: 0.68,
        glowScale: 0.62,
        motionScale: 0.68,
        warning: config.motion.particlesEnabled ? "Particles are limited for this vault size." : null
      };
    }
    if (load > 1200) {
      return {
        particleScale: 0.72,
        labelScale: 0.72,
        edgeScale: 0.84,
        glowScale: 0.82,
        motionScale: 0.86,
        warning: null
      };
    }
    return {
      particleScale: 1,
      labelScale: 1,
      edgeScale: 1,
      glowScale: 1,
      motionScale: 1,
      warning: null
    };
  }
}
