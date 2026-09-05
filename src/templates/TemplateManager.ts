import { cloneConfiguration } from "../core/ActiveConfiguration";
import type { ActiveConfiguration, StoredTemplate } from "../core/types";

type ConfigurationPatch = Partial<Omit<ActiveConfiguration, "graph" | "motion" | "background" | "journey" | "discovery" | "display" | "interaction" | "template">> & {
  graph?: Partial<ActiveConfiguration["graph"]>;
  motion?: Partial<ActiveConfiguration["motion"]>;
  background?: Partial<ActiveConfiguration["background"]>;
  journey?: Partial<ActiveConfiguration["journey"]>;
  discovery?: Partial<ActiveConfiguration["discovery"]>;
  display?: Partial<ActiveConfiguration["display"]>;
  interaction?: Partial<ActiveConfiguration["interaction"]>;
};

export class TemplateManager {
  createBuiltIns(base: ActiveConfiguration): StoredTemplate[] {
    const now = Date.now();
    return [
      this.template("builtin-calm", "Calm", now, base, { mode: "wander", visual: "minimal", colors: "deep-ocean", camera: "calm" }, true),
      this.template("builtin-cinematic", "Cinematic", now, base, { mode: "path-journey", visual: "deep-space", colors: "aurora", camera: "cinematic" }, true),
      this.template("builtin-constellation", "Constellation", now, base, { mode: "wander", visual: "constellation", colors: "aurora", camera: "floating" }, true),
      this.template("builtin-star-map", "Star Map", now, base, {
        mode: "path-journey",
        visual: "constellation",
        colors: "star-map",
        camera: "floating",
        background: { style: "star-map" },
        motion: {
          ...base.motion,
          animationSpeed: 0.38,
          cameraSpeed: 0.24,
          visualIntensity: 0.7,
          colorSpeed: 0.32,
          colorIntensity: 0.78,
          particlesEnabled: true,
          nodeMovementEnabled: true,
          connectionPulsesEnabled: true,
          glowEnabled: true,
          backgroundEffectsEnabled: true,
          particleAmount: 150,
          particleSpeed: 0.24,
          pulseAmount: 12,
          drawingLinesEnabled: true,
          drawingLineSpeed: 0.34,
          nodeMovementStyle: "orbit",
          nodeMovementStrength: 0.32,
          nodeMovementSpeed: 0.28,
          pathAnimation: "comet",
          pulseStyle: "star-spark",
          clickAnimation: "starburst"
        },
        display: {
          ...base.display,
          showNodeInfoOverlay: false
        }
      }, true),
      this.template("builtin-neon", "Neon", now, base, { mode: "random-discovery", visual: "neon", colors: "rainbow-flow", camera: "dynamic" }, true),
      this.template("builtin-discovery", "Discovery", now, base, { mode: "forgotten-knowledge", visual: "soft-glow", colors: "forest", camera: "floating" }, true),
      this.template("builtin-zen-garden", "Zen Garden", now, base, {
        mode: "wander",
        visual: "clean",
        colors: "zen-garden",
        camera: "calm",
        background: { style: "zen-garden" },
        motion: { ...base.motion, animationSpeed: 0.16, cameraSpeed: 0.12, visualIntensity: 0.38, colorSpeed: 0.12, particlesEnabled: false, nodeMovementEnabled: true, connectionPulsesEnabled: false, glowEnabled: true, backgroundEffectsEnabled: false, nodeMovementStyle: "gentle-float", nodeMovementStrength: 0.12, nodeMovementSpeed: 0.14, clickAnimation: "halo" },
        display: { ...base.display, showNodeInfoOverlay: false }
      }, true),
      this.template("builtin-blueprint", "Blueprint", now, base, {
        mode: "hub-explorer",
        visual: "clean",
        colors: "blueprint",
        camera: "static",
        background: { style: "blueprint" },
        motion: { ...base.motion, animationSpeed: 0.2, cameraSpeed: 0.1, visualIntensity: 0.48, colorSpeed: 0.16, particlesEnabled: false, nodeMovementEnabled: false, connectionPulsesEnabled: true, glowEnabled: false, backgroundEffectsEnabled: true, pulseAmount: 6, pathAnimation: "wave", pulseStyle: "hollow-dot", clickAnimation: "scanner" }
      }, true),
      this.template("builtin-solar-system", "Solar System", now, base, {
        mode: "cluster-journey",
        visual: "constellation",
        colors: "solar-system",
        camera: "floating",
        background: { style: "solar-system" },
        motion: { ...base.motion, animationSpeed: 0.36, cameraSpeed: 0.24, visualIntensity: 0.72, colorSpeed: 0.28, particlesEnabled: true, nodeMovementEnabled: true, connectionPulsesEnabled: true, glowEnabled: true, backgroundEffectsEnabled: true, particleAmount: 95, particleSpeed: 0.18, pulseAmount: 10, nodeMovementStyle: "orbit", nodeMovementStrength: 0.46, nodeMovementSpeed: 0.34, pathAnimation: "comet", pulseStyle: "glow-bloom", clickAnimation: "orbit-dots" }
      }, true),
      this.template("builtin-library-night", "Library Night", now, base, {
        mode: "forgotten-knowledge",
        visual: "clean",
        colors: "library-night",
        camera: "calm",
        background: { style: "library-night" },
        motion: { ...base.motion, animationSpeed: 0.18, cameraSpeed: 0.14, visualIntensity: 0.34, colorSpeed: 0.1, particlesEnabled: false, nodeMovementEnabled: true, connectionPulsesEnabled: false, glowEnabled: false, backgroundEffectsEnabled: false, nodeMovementStyle: "drift", nodeMovementStrength: 0.1, nodeMovementSpeed: 0.12, clickAnimation: "pulse-ring" }
      }, true),
      this.template("builtin-crystal", "Crystal", now, base, {
        mode: "random-discovery",
        visual: "soft-glow",
        colors: "crystal",
        camera: "floating",
        background: { style: "crystal" },
        motion: { ...base.motion, animationSpeed: 0.44, cameraSpeed: 0.28, visualIntensity: 0.78, colorSpeed: 0.42, particlesEnabled: true, nodeMovementEnabled: true, connectionPulsesEnabled: true, glowEnabled: true, backgroundEffectsEnabled: true, particleAmount: 120, particleSpeed: 0.26, pulseAmount: 14, nodeMovementStyle: "breathing", nodeMovementStrength: 0.38, nodeMovementSpeed: 0.3, pathAnimation: "sparkle-train", pulseStyle: "diamond", clickAnimation: "diamond-pop" }
      }, true),
      this.template("builtin-terminal-amber", "Terminal Amber", now, base, {
        mode: "path-journey",
        visual: "neon",
        colors: "terminal-amber",
        camera: "cinematic",
        background: { style: "terminal-amber" },
        motion: { ...base.motion, animationSpeed: 0.56, cameraSpeed: 0.32, visualIntensity: 0.7, colorSpeed: 0.5, particlesEnabled: true, nodeMovementEnabled: true, connectionPulsesEnabled: true, glowEnabled: true, backgroundEffectsEnabled: true, particleAmount: 100, particleSpeed: 0.44, pulseAmount: 18, nodeMovementStyle: "jitter", nodeMovementStrength: 0.32, nodeMovementSpeed: 0.48, pathAnimation: "data-rain", pulseStyle: "scanner", clickAnimation: "scanner" }
      }, true),
      this.template("builtin-red-alert", "Red Alert", now, base, {
        mode: "random-discovery",
        visual: "neon",
        colors: "red-alert",
        camera: "dynamic",
        background: { style: "red-alert" },
        motion: { ...base.motion, animationSpeed: 0.82, cameraSpeed: 0.58, visualIntensity: 0.86, colorSpeed: 0.68, particlesEnabled: true, nodeMovementEnabled: true, connectionPulsesEnabled: true, glowEnabled: true, backgroundEffectsEnabled: true, particleAmount: 150, particleSpeed: 0.72, pulseAmount: 30, nodeMovementStyle: "chaos", nodeMovementStrength: 0.72, nodeMovementSpeed: 0.88, pathAnimation: "signal-burst", pulseStyle: "scanner", clickAnimation: "shockwave" },
        display: { ...base.display, showNodeInfoOverlay: false }
      }, true),
      this.template("builtin-ocean-depths", "Ocean Depths", now, base, {
        mode: "wander",
        visual: "deep-space",
        colors: "ocean-depths",
        camera: "floating",
        background: { style: "ocean-depths" },
        motion: { ...base.motion, animationSpeed: 0.24, cameraSpeed: 0.18, visualIntensity: 0.66, colorSpeed: 0.18, particlesEnabled: true, nodeMovementEnabled: true, connectionPulsesEnabled: true, glowEnabled: true, backgroundEffectsEnabled: true, particleAmount: 180, particleSpeed: 0.12, pulseAmount: 8, nodeMovementStyle: "gentle-float", nodeMovementStrength: 0.22, nodeMovementSpeed: 0.18, pathAnimation: "wave", pulseStyle: "glow-bloom", clickAnimation: "halo" }
      }, true),
      this.template("builtin-paper-minimal", "Paper Minimal", now, base, {
        mode: "recent-activity",
        visual: "minimal",
        colors: "paper-minimal",
        camera: "static",
        background: { style: "paper-minimal" },
        motion: { ...base.motion, animationSpeed: 0.06, cameraSpeed: 0.04, visualIntensity: 0.16, colorSpeed: 0.04, particlesEnabled: false, nodeMovementEnabled: false, connectionPulsesEnabled: false, glowEnabled: false, backgroundEffectsEnabled: false, drawingLinesEnabled: false, clickAnimation: "none" },
        display: { ...base.display, showLabels: true, showNodeInfoOverlay: false }
      }, true),
      this.template("builtin-galaxy-core", "Galaxy Core", now, base, {
        mode: "path-journey",
        visual: "deep-space",
        colors: "galaxy-core",
        camera: "cinematic",
        background: { style: "galaxy-core" },
        motion: { ...base.motion, animationSpeed: 0.58, cameraSpeed: 0.42, visualIntensity: 0.9, colorSpeed: 0.62, particlesEnabled: true, nodeMovementEnabled: true, connectionPulsesEnabled: true, glowEnabled: true, backgroundEffectsEnabled: true, particleAmount: 230, particleSpeed: 0.36, pulseAmount: 18, nodeMovementStyle: "spiral", nodeMovementStrength: 0.72, nodeMovementSpeed: 0.54, pathAnimation: "comet", pulseStyle: "glow-bloom", clickAnimation: "starburst" },
        display: { ...base.display, showNodeInfoOverlay: false }
      }, true),
      this.template("builtin-heatmap", "Heatmap", now, base, { mode: "hub-explorer", visual: "clean", colors: "heatmap", camera: "calm", motion: { ...base.motion, connectionPulsesEnabled: true, pulseAmount: 10, pathAnimation: "single-pulse", clickAnimation: "pulse-ring" } }, true),
      this.template("builtin-age-gradient", "Age Gradient", now, base, { mode: "recent-activity", visual: "soft-glow", colors: "age-gradient", camera: "calm", motion: { ...base.motion, connectionPulsesEnabled: true, pulseAmount: 8, pathAnimation: "wave", clickAnimation: "halo" } }, true),
      this.template("builtin-cluster-neon", "Cluster Neon", now, base, { mode: "cluster-journey", visual: "neon", colors: "cluster-neon", camera: "dynamic", background: { style: "nebula" }, motion: { ...base.motion, colorSpeed: 0.56, particlesEnabled: true, connectionPulsesEnabled: true, pulseAmount: 20, pathAnimation: "sparkle-train", pulseStyle: "star-spark", clickAnimation: "spark" } }, true),
      this.template("builtin-focus-fade", "Focus Fade", now, base, { mode: "hub-explorer", visual: "clean", colors: "focus-fade", camera: "calm", motion: { ...base.motion, connectionPulsesEnabled: false, clickAnimation: "halo" } }, true),
      this.template("builtin-signal-strength", "Signal Strength", now, base, { mode: "hub-explorer", visual: "neon", colors: "signal-strength", camera: "floating", motion: { ...base.motion, connectionPulsesEnabled: true, pulseAmount: 18, pathAnimation: "signal-burst", pulseStyle: "scanner", clickAnimation: "shockwave" } }, true),
      this.template("builtin-night-vision", "Night Vision", now, base, { mode: "forgotten-knowledge", visual: "neon", colors: "night-vision", camera: "calm", background: { style: "matrix" }, motion: { ...base.motion, colorSpeed: 0.22, particlesEnabled: true, particleAmount: 50, connectionPulsesEnabled: true, pulseAmount: 9, pathAnimation: "data-rain", pulseStyle: "hollow-dot", clickAnimation: "scanner" } }, true),
      this.template("builtin-archive-dust", "Archive Dust", now, base, { mode: "forgotten-knowledge", visual: "soft-glow", colors: "archive-dust", camera: "floating", background: { style: "library-night" }, motion: { ...base.motion, particlesEnabled: true, particleAmount: 130, particleSpeed: 0.1, connectionPulsesEnabled: false, nodeMovementStyle: "drift", nodeMovementStrength: 0.16, nodeMovementSpeed: 0.12, clickAnimation: "comet-bloom" } }, true),
      this.template("builtin-prism-flow", "Prism Flow", now, base, { mode: "random-discovery", visual: "neon", colors: "prism-flow", camera: "dynamic", background: { style: "animated-gradient" }, motion: { ...base.motion, colorSpeed: 0.9, particlesEnabled: true, particleAmount: 160, connectionPulsesEnabled: true, pulseAmount: 22, pathAnimation: "sparkle-train", pulseStyle: "ripple", clickAnimation: "double-ripple" } }, true),
      this.template("builtin-constellation-white", "Constellation White", now, base, { mode: "path-journey", visual: "constellation", colors: "constellation-white", camera: "floating", background: { style: "star-map" }, motion: { ...base.motion, particlesEnabled: true, particleAmount: 115, connectionPulsesEnabled: true, pulseAmount: 8, pathAnimation: "comet", pulseStyle: "star-spark", clickAnimation: "starburst" } }, true),
      this.template("builtin-infrared", "Infrared", now, base, { mode: "random-discovery", visual: "soft-glow", colors: "infrared", camera: "dynamic", background: { style: "red-alert" }, motion: { ...base.motion, colorSpeed: 0.5, particlesEnabled: true, particleAmount: 100, connectionPulsesEnabled: true, pulseAmount: 16, pathAnimation: "wave", pulseStyle: "glow-bloom", clickAnimation: "shockwave" } }, true),
      this.template("builtin-dark-mode", "Dark Mode", now, base, {
        mode: "wander",
        visual: "clean",
        colors: "dark-mode",
        camera: "calm",
        background: { style: "dark-mode" },
        motion: {
          ...base.motion,
          animationSpeed: 0.22,
          cameraSpeed: 0.16,
          visualIntensity: 0.42,
          colorSpeed: 0.18,
          colorIntensity: 0.52,
          particlesEnabled: false,
          nodeMovementEnabled: true,
          connectionPulsesEnabled: true,
          glowEnabled: true,
          backgroundEffectsEnabled: false,
          particleAmount: 0,
          pulseAmount: 6,
          drawingLinesEnabled: false,
          nodeMovementStyle: "gentle-float",
          nodeMovementStrength: 0.18,
          nodeMovementSpeed: 0.2,
          pathAnimation: "single-pulse",
          pulseStyle: "hollow-dot",
          clickAnimation: "halo"
        },
        display: {
          ...base.display,
          showNodeInfoOverlay: false
        }
      }, true),
      this.template("builtin-minimal-dark", "Minimal Dark", now, base, {
        mode: "wander",
        visual: "minimal",
        colors: "graphite",
        camera: "static",
        background: { style: "solid-dark" },
        motion: {
          ...base.motion,
          animationSpeed: 0.12,
          cameraSpeed: 0.1,
          visualIntensity: 0.18,
          colorIntensity: 0.35,
          particlesEnabled: false,
          nodeMovementEnabled: false,
          connectionPulsesEnabled: false,
          glowEnabled: false,
          backgroundEffectsEnabled: false,
          clickAnimation: "none"
        },
        display: {
          ...base.display,
          showNodeInfoOverlay: false
        }
      }, true),
      this.template("builtin-minimal-light", "Minimal Light", now, base, {
        mode: "wander",
        visual: "minimal",
        colors: "ink",
        camera: "static",
        background: { style: "solid-light" },
        motion: {
          ...base.motion,
          animationSpeed: 0.08,
          cameraSpeed: 0.08,
          visualIntensity: 0.16,
          colorIntensity: 0.3,
          particlesEnabled: false,
          nodeMovementEnabled: false,
          connectionPulsesEnabled: false,
          glowEnabled: false,
          backgroundEffectsEnabled: false
        },
        display: {
          ...base.display,
          showNodeInfoOverlay: false
        }
      }, true),
      this.template("builtin-minimal-focus", "Minimal Focus", now, base, {
        mode: "hub-explorer",
        visual: "clean",
        colors: "monochrome",
        camera: "calm",
        background: { style: "theme" },
        motion: {
          ...base.motion,
          animationSpeed: 0.18,
          cameraSpeed: 0.18,
          visualIntensity: 0.24,
          particlesEnabled: false,
          nodeMovementEnabled: false,
          connectionPulsesEnabled: false,
          glowEnabled: false,
          backgroundEffectsEnabled: false
        }
      }, true),
      this.template("builtin-quiet-map", "Quiet Map", now, base, {
        mode: "wander",
        visual: "clean",
        colors: "nord",
        camera: "calm",
        background: { style: "midnight" },
        motion: {
          ...base.motion,
          animationSpeed: 0.2,
          cameraSpeed: 0.14,
          visualIntensity: 0.28,
          particleAmount: 8,
          particlesEnabled: false,
          nodeMovementEnabled: true,
          connectionPulsesEnabled: false,
          glowEnabled: false,
          backgroundEffectsEnabled: false
        }
      }, true),
      this.template("builtin-paper-notes", "Paper Notes", now, base, {
        mode: "recent-activity",
        visual: "minimal",
        colors: "pearl",
        camera: "static",
        background: { style: "paper" },
        motion: {
          ...base.motion,
          animationSpeed: 0.1,
          cameraSpeed: 0.08,
          visualIntensity: 0.18,
          particlesEnabled: false,
          nodeMovementEnabled: false,
          connectionPulsesEnabled: false,
          glowEnabled: false,
          backgroundEffectsEnabled: false
        }
      }, true),
      this.template("builtin-ink-map", "Ink Map", now, base, {
        mode: "forgotten-knowledge",
        visual: "minimal",
        colors: "ink",
        camera: "calm",
        background: { style: "paper" },
        motion: {
          ...base.motion,
          animationSpeed: 0.14,
          cameraSpeed: 0.12,
          visualIntensity: 0.2,
          particlesEnabled: false,
          nodeMovementEnabled: false,
          connectionPulsesEnabled: false,
          glowEnabled: false,
          backgroundEffectsEnabled: false
        }
      }, true),
      this.template("builtin-clean-clusters", "Clean Clusters", now, base, {
        mode: "cluster-journey",
        visual: "clean",
        colors: "cluster-based",
        camera: "calm",
        background: { style: "theme" },
        motion: {
          ...base.motion,
          animationSpeed: 0.22,
          cameraSpeed: 0.2,
          visualIntensity: 0.32,
          particleAmount: 0,
          particlesEnabled: false,
          nodeMovementEnabled: true,
          connectionPulsesEnabled: false,
          glowEnabled: false,
          backgroundEffectsEnabled: false,
          nodeMovementStyle: "swarm",
          nodeMovementStrength: 0.3,
          nodeMovementSpeed: 0.25
        }
      }, true),
      this.template("builtin-matrix-hacker", "Matrix Hacker", now, base, {
        mode: "path-journey",
        visual: "neon",
        colors: "mint",
        camera: "cinematic",
        background: { style: "matrix" },
        motion: {
          ...base.motion,
          animationSpeed: 0.72,
          cameraSpeed: 0.42,
          visualIntensity: 0.82,
          colorSpeed: 0.68,
          colorIntensity: 0.9,
          particleAmount: 140,
          pulseAmount: 18,
          particlesEnabled: true,
          nodeMovementEnabled: true,
          connectionPulsesEnabled: true,
          glowEnabled: true,
          backgroundEffectsEnabled: true,
          nodeMovementStyle: "jitter",
          nodeMovementStrength: 0.68,
          nodeMovementSpeed: 0.82,
          pathAnimation: "data-rain",
          pulseStyle: "scanner",
          clickAnimation: "scanner"
        },
        display: {
          ...base.display,
          showNodeInfoOverlay: false
        }
      }, true),
      this.template("builtin-orbital-drift", "Orbital Drift", now, base, {
        mode: "cluster-journey",
        visual: "constellation",
        colors: "aurora",
        camera: "floating",
        background: { style: "deep-space" },
        motion: {
          ...base.motion,
          animationSpeed: 0.44,
          cameraSpeed: 0.32,
          visualIntensity: 0.72,
          particlesEnabled: true,
          nodeMovementEnabled: true,
          connectionPulsesEnabled: true,
          glowEnabled: true,
          backgroundEffectsEnabled: true,
          particleAmount: 110,
          pulseAmount: 10,
          nodeMovementStyle: "orbit",
          nodeMovementStrength: 0.54,
          nodeMovementSpeed: 0.46,
          pathAnimation: "comet",
          pulseStyle: "glow-bloom"
        }
      }, true),
      this.template("builtin-swarm-field", "Swarm Field", now, base, {
        mode: "random-discovery",
        visual: "soft-glow",
        colors: "cluster-based",
        camera: "dynamic",
        background: { style: "nebula" },
        motion: {
          ...base.motion,
          animationSpeed: 0.62,
          cameraSpeed: 0.5,
          visualIntensity: 0.8,
          particlesEnabled: true,
          nodeMovementEnabled: true,
          connectionPulsesEnabled: true,
          glowEnabled: true,
          backgroundEffectsEnabled: true,
          particleAmount: 180,
          pulseAmount: 20,
          nodeMovementStyle: "swarm",
          nodeMovementStrength: 0.78,
          nodeMovementSpeed: 0.72,
          pathAnimation: "sparkle-train",
          pulseStyle: "star-spark"
        }
      }, true),
      this.template("builtin-signal-chaos", "Signal Chaos", now, base, {
        mode: "random-discovery",
        visual: "neon",
        colors: "cyberpunk",
        camera: "dynamic",
        background: { style: "animated-gradient" },
        motion: {
          ...base.motion,
          animationSpeed: 0.86,
          cameraSpeed: 0.64,
          visualIntensity: 0.88,
          colorSpeed: 0.86,
          particlesEnabled: true,
          nodeMovementEnabled: true,
          connectionPulsesEnabled: true,
          glowEnabled: true,
          backgroundEffectsEnabled: true,
          particleAmount: 220,
          pulseAmount: 28,
          nodeMovementStyle: "chaos",
          nodeMovementStrength: 0.9,
          nodeMovementSpeed: 0.95,
          pathAnimation: "traffic-flow",
          pulseStyle: "ripple",
          clickAnimation: "shockwave"
        }
      }, true),
      this.template("builtin-breathing-graph", "Breathing Graph", now, base, {
        mode: "wander",
        visual: "soft-glow",
        colors: "pastel",
        camera: "calm",
        background: { style: "gradient" },
        motion: {
          ...base.motion,
          animationSpeed: 0.34,
          cameraSpeed: 0.2,
          visualIntensity: 0.58,
          particlesEnabled: false,
          nodeMovementEnabled: true,
          connectionPulsesEnabled: false,
          glowEnabled: true,
          backgroundEffectsEnabled: false,
          nodeMovementStyle: "breathing",
          nodeMovementStrength: 0.52,
          nodeMovementSpeed: 0.34
        }
      }, true),
      this.template("builtin-city-lights", "City Lights", now, base, {
        mode: "path-journey",
        visual: "clean",
        colors: "city-nights",
        camera: "cinematic",
        background: { style: "midnight" },
        motion: {
          ...base.motion,
          animationSpeed: 0.58,
          cameraSpeed: 0.36,
          visualIntensity: 0.66,
          colorSpeed: 0.52,
          colorIntensity: 0.86,
          particlesEnabled: true,
          nodeMovementEnabled: true,
          connectionPulsesEnabled: true,
          glowEnabled: true,
          backgroundEffectsEnabled: true,
          particleAmount: 55,
          pulseAmount: 24,
          nodeMovementStyle: "drift",
          nodeMovementStrength: 0.18,
          nodeMovementSpeed: 0.22,
          pathAnimation: "traffic-flow",
          pulseStyle: "car-lights",
          clickAnimation: "comet-bloom"
        },
        display: {
          ...base.display,
          showNodeInfoOverlay: false
        }
      }, true)
    ];
  }

  ensureBuiltIns(templates: StoredTemplate[], base: ActiveConfiguration): StoredTemplate[] {
    const byId = new Map(templates.map((template) => [template.id, template]));
    this.createBuiltIns(base).forEach((template) => {
      if (!byId.has(template.id)) {
        byId.set(template.id, template);
      }
    });
    return [...byId.values()];
  }

  saveAs(templates: StoredTemplate[], name: string, config: ActiveConfiguration): StoredTemplate[] {
    const now = Date.now();
    return [
      ...templates,
      {
        id: `template-${now}-${Math.random().toString(36).slice(2, 8)}`,
        schemaVersion: 1,
        type: "full",
        name,
        builtIn: false,
        favorite: false,
        createdAt: now,
        updatedAt: now,
        value: {
          ...cloneConfiguration(config),
          template: {
            activeTemplateId: "",
            modified: false
          }
        }
      }
    ];
  }

  save(templates: StoredTemplate[], id: string, config: ActiveConfiguration): StoredTemplate[] {
    return templates.map((template) => {
      if (template.id !== id || template.builtIn) {
        return template;
      }
      return {
        ...template,
        updatedAt: Date.now(),
        value: {
          ...cloneConfiguration(config),
          template: {
            activeTemplateId: id,
            modified: false
          }
        }
      };
    });
  }

  duplicate(templates: StoredTemplate[], id: string): StoredTemplate[] {
    const source = templates.find((template) => template.id === id);
    if (!source) {
      return templates;
    }
    const now = Date.now();
    return [
      ...templates,
      {
        ...source,
        id: `template-${now}-${Math.random().toString(36).slice(2, 8)}`,
        name: `${source.name} Copy`,
        builtIn: false,
        favorite: false,
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  delete(templates: StoredTemplate[], id: string): StoredTemplate[] {
    return templates.filter((template) => template.id !== id || template.builtIn);
  }

  toggleFavorite(templates: StoredTemplate[], id: string): StoredTemplate[] {
    return templates.map((template) => template.id === id ? { ...template, favorite: !template.favorite, updatedAt: Date.now() } : template);
  }

  private template(
    id: string,
    name: string,
    now: number,
    base: ActiveConfiguration,
    patch: ConfigurationPatch,
    builtIn: boolean
  ): StoredTemplate {
    const baseConfig = cloneConfiguration(base);
    return {
      id,
      schemaVersion: 1,
      type: "full",
      name,
      builtIn,
      favorite: id === "builtin-constellation",
      createdAt: now,
      updatedAt: now,
      value: {
        ...baseConfig,
        ...patch,
        graph: {
          ...baseConfig.graph,
          ...(patch.graph ?? {})
        },
        motion: {
          ...baseConfig.motion,
          ...(patch.motion ?? {})
        },
        background: {
          ...baseConfig.background,
          ...(patch.background ?? {})
        },
        journey: {
          ...baseConfig.journey,
          ...(patch.journey ?? {})
        },
        discovery: {
          ...baseConfig.discovery,
          ...(patch.discovery ?? {})
        },
        display: {
          ...baseConfig.display,
          ...(patch.display ?? {})
        },
        interaction: {
          ...baseConfig.interaction,
          ...(patch.interaction ?? {}),
          pinnedNodeIds: patch.interaction?.pinnedNodeIds ?? baseConfig.interaction.pinnedNodeIds,
          hiddenNodeIds: patch.interaction?.hiddenNodeIds ?? baseConfig.interaction.hiddenNodeIds,
          hiddenClusterIds: patch.interaction?.hiddenClusterIds ?? baseConfig.interaction.hiddenClusterIds
        },
        template: {
          activeTemplateId: id,
          modified: false
        }
      }
    };
  }
}
