import type { ActiveConfiguration, CameraId, ColorsId, GraphScope, ModeId, VisualId } from "./types";

export const DEFAULT_CONFIGURATION: ActiveConfiguration = {
  mode: "wander",
  visual: "constellation",
  colors: "aurora",
  camera: "floating",
  graph: {
    scope: "global",
    localDepth: 2,
    useCurrentGraphWhenAvailable: true,
    folderFilter: "",
    tagFilter: "",
    dateFilter: "all",
    minimumConnections: 0
  },
  motion: {
    animationSpeed: 0.55,
    cameraSpeed: 0.35,
    visualIntensity: 0.7,
    colorSpeed: 0.45,
    colorIntensity: 0.75,
    particlesEnabled: false,
    nodeMovementEnabled: true,
    connectionPulsesEnabled: false,
    glowEnabled: true,
    backgroundEffectsEnabled: true,
    pulseAmount: 8,
    particleAmount: 70,
    particleSpeed: 0.45,
    drawingLinesEnabled: false,
    drawingLineSpeed: 0.35,
    pathAnimation: "comet",
    pulseStyle: "orb",
    nodeMovementStyle: "gentle-float",
    nodeMovementStrength: 0.35,
    nodeMovementSpeed: 0.45,
    clickAnimation: "ripple",
    reduceMotion: false
  },
  background: {
    style: "deep-space",
    intensity: 0.75
  },
  journey: {
    minNodes: 5,
    maxNodes: 18,
    nodePauseSeconds: 3,
    avoidRecentlyVisited: true,
    deadEndBehavior: "random-jump",
    afterJourney: "start-new-journey"
  },
  discovery: {
    recentDays: 30,
    forgottenDays: 180,
    minimumConnections: 1,
    includeOrphans: true,
    excludeTemplates: false,
    excludeAttachments: true,
    excludeDailyNotes: false
  },
  display: {
    hideUi: false,
    fullscreen: false,
    autoHideCursorSeconds: 5,
    showNodeInfoOverlay: true,
    showLabels: true,
    showLegend: true,
    showFps: false,
    labelSize: 0.48,
    edgeThickness: 0.32,
    nodeSize: 0.45
  },
  interaction: {
    pinnedNodeIds: [],
    hiddenNodeIds: [],
    hiddenClusterIds: [],
    expandFromNodeId: null,
    pathPreviewStartId: null
  },
  template: {
    activeTemplateId: "builtin-constellation",
    modified: false
  }
};

export function cloneConfiguration(config: ActiveConfiguration): ActiveConfiguration {
  return {
    ...config,
    graph: { ...config.graph },
    motion: { ...config.motion },
    background: { ...config.background },
    template: { ...config.template },
    journey: { ...config.journey },
    discovery: { ...config.discovery },
    display: { ...config.display },
    interaction: {
      pinnedNodeIds: [...config.interaction.pinnedNodeIds],
      hiddenNodeIds: [...config.interaction.hiddenNodeIds],
      hiddenClusterIds: [...config.interaction.hiddenClusterIds],
      expandFromNodeId: config.interaction.expandFromNodeId,
      pathPreviewStartId: config.interaction.pathPreviewStartId
    }
  };
}

export function withGraphScope(config: ActiveConfiguration, scope: GraphScope): ActiveConfiguration {
  return markModified({ ...cloneConfiguration(config), graph: { ...config.graph, scope } });
}

export function withMode(config: ActiveConfiguration, mode: ModeId): ActiveConfiguration {
  return markModified({ ...cloneConfiguration(config), mode });
}

export function withVisual(config: ActiveConfiguration, visual: VisualId): ActiveConfiguration {
  return markModified({ ...cloneConfiguration(config), visual });
}

export function withColors(config: ActiveConfiguration, colors: ColorsId): ActiveConfiguration {
  return markModified({ ...cloneConfiguration(config), colors });
}

export function withCamera(config: ActiveConfiguration, camera: CameraId): ActiveConfiguration {
  return markModified({ ...cloneConfiguration(config), camera });
}

export function markModified(config: ActiveConfiguration): ActiveConfiguration {
  return {
    ...config,
    template: {
      ...config.template,
      modified: true
    }
  };
}
