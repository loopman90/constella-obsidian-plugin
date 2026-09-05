import type { TFile } from "obsidian";

export type GraphScope = "global" | "local" | "current";
export type PlaybackState = "idle" | "playing" | "paused";

export type ModeId =
  | "wander"
  | "path-journey"
  | "recent-activity"
  | "forgotten-knowledge"
  | "hub-explorer"
  | "hidden-gems"
  | "cluster-journey"
  | "random-discovery";

export type VisualId =
  | "minimal"
  | "constellation"
  | "deep-space"
  | "neon"
  | "soft-glow"
  | "clean"
  | "star-chart"
  | "galaxy-spiral"
  | "matrix-grid"
  | "blueprint-lines"
  | "orbital-rings"
  | "city-network"
  | "data-stream"
  | "heatmap-cloud"
  | "paper-map"
  | "library-index"
  | "zen-stones"
  | "crystal-lattice"
  | "solar-orbits"
  | "terminal-blocks"
  | "red-scanner"
  | "ocean-bubbles"
  | "prism-shards"
  | "radar-sweep"
  | "topographic"
  | "circuit-board";
export type ColorsId =
  | "aurora"
  | "rainbow-flow"
  | "deep-ocean"
  | "monochrome"
  | "sunset"
  | "forest"
  | "cluster-based"
  | "pastel"
  | "glacier"
  | "ember"
  | "cyberpunk"
  | "rose-garden"
  | "vaporwave"
  | "solarized"
  | "nord"
  | "graphite"
  | "high-contrast"
  | "candy"
  | "midnight-gold"
  | "violet-storm"
  | "mint"
  | "lava"
  | "arctic"
  | "meadow"
  | "ocean-sunset"
  | "ink"
  | "pearl"
  | "city-nights"
  | "star-map"
  | "dark-mode"
  | "zen-garden"
  | "blueprint"
  | "solar-system"
  | "library-night"
  | "crystal"
  | "terminal-amber"
  | "red-alert"
  | "ocean-depths"
  | "paper-minimal"
  | "galaxy-core"
  | "heatmap"
  | "age-gradient"
  | "cluster-neon"
  | "focus-fade"
  | "signal-strength"
  | "night-vision"
  | "archive-dust"
  | "prism-flow"
  | "constellation-white"
  | "infrared";
export type CameraId = "static" | "calm" | "floating" | "cinematic" | "dynamic" | "fast" | "custom";
export type TransitionId = "instant" | "crossfade" | "color-morph" | "smooth-camera" | "fade-to-black";
export type TemplateComponentType = "full" | "mode" | "visual" | "colors" | "camera" | "playlist";
export type PathAnimationId =
  | "single-pulse"
  | "comet"
  | "bidirectional"
  | "wave"
  | "sparkle-train"
  | "traffic-flow"
  | "data-rain"
  | "signal-burst";
export type PulseStyleId =
  | "orb"
  | "ring"
  | "double-ring"
  | "diamond"
  | "square-packet"
  | "hollow-dot"
  | "glow-bloom"
  | "star-spark"
  | "scanner"
  | "ripple"
  | "car-lights";
export type BackgroundId =
  | "theme"
  | "solid-dark"
  | "solid-light"
  | "gradient"
  | "animated-gradient"
  | "stars"
  | "deep-space"
  | "transparent"
  | "aurora"
  | "nebula"
  | "paper"
  | "midnight"
  | "dawn"
  | "matrix"
  | "star-map"
  | "dark-mode"
  | "zen-garden"
  | "blueprint"
  | "solar-system"
  | "library-night"
  | "crystal"
  | "terminal-amber"
  | "red-alert"
  | "ocean-depths"
  | "paper-minimal"
  | "galaxy-core";
export type NodeMovementStyleId =
  | "gentle-float"
  | "drift"
  | "orbit"
  | "breathing"
  | "scatter"
  | "swarm"
  | "jitter"
  | "spiral"
  | "chaos";
export type ClickAnimationId =
  | "ripple"
  | "double-ripple"
  | "spark"
  | "starburst"
  | "halo"
  | "pulse-ring"
  | "scanner"
  | "diamond-pop"
  | "orbit-dots"
  | "shockwave"
  | "comet-bloom"
  | "none";

export interface ActiveConfiguration {
  mode: ModeId;
  visual: VisualId;
  colors: ColorsId;
  camera: CameraId;
  graph: {
    scope: GraphScope;
    localDepth: number;
    useCurrentGraphWhenAvailable: boolean;
    folderFilter: string;
    tagFilter: string;
    dateFilter: "all" | "recent" | "forgotten";
    minimumConnections: number;
  };
  motion: {
    animationSpeed: number;
    cameraSpeed: number;
    visualIntensity: number;
    colorSpeed: number;
    colorIntensity: number;
    particlesEnabled: boolean;
    nodeMovementEnabled: boolean;
    connectionPulsesEnabled: boolean;
    glowEnabled: boolean;
    backgroundEffectsEnabled: boolean;
    pulseAmount: number;
    particleAmount: number;
    particleSpeed: number;
    drawingLinesEnabled: boolean;
    drawingLineSpeed: number;
    pathAnimation: PathAnimationId;
    pulseStyle: PulseStyleId;
    nodeMovementStyle: NodeMovementStyleId;
    nodeMovementStrength: number;
    nodeMovementSpeed: number;
    clickAnimation: ClickAnimationId;
    reduceMotion: boolean;
  };
  background: {
    style: BackgroundId;
    intensity: number;
  };
  journey: {
    minNodes: number;
    maxNodes: number;
    nodePauseSeconds: number;
    avoidRecentlyVisited: boolean;
    deadEndBehavior: "random-jump" | "new-start" | "stop";
    afterJourney: "start-new-journey" | "zoom-out" | "pause" | "stop";
  };
  discovery: {
    recentDays: number;
    forgottenDays: number;
    minimumConnections: number;
    includeOrphans: boolean;
    excludeTemplates: boolean;
    excludeAttachments: boolean;
    excludeDailyNotes: boolean;
  };
  display: {
    hideUi: boolean;
    fullscreen: boolean;
    autoHideCursorSeconds: number;
    showNodeInfoOverlay: boolean;
    showLabels: boolean;
    showLegend: boolean;
    showFps: boolean;
    labelSize: number;
    edgeThickness: number;
    nodeSize: number;
  };
  interaction: {
    pinnedNodeIds: string[];
    hiddenNodeIds: string[];
    hiddenClusterIds: number[];
    expandFromNodeId: string | null;
    pathPreviewStartId: string | null;
  };
  template: {
    activeTemplateId: string;
    modified: boolean;
  };
}

export interface GraphNode {
  id: string;
  path: string;
  title: string;
  file: TFile;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  connectionCount: number;
  lastModified: number;
  clusterId: number;
  clusterSize: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface JourneyState {
  path: string[];
  currentIndex: number;
  startedAt: number;
  nextStepAt: number;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface BuiltInOption<T extends string> {
  id: T;
  label: string;
}

export interface StoredComponent<TType extends TemplateComponentType, TValue> {
  id: string;
  schemaVersion: number;
  type: TType;
  name: string;
  builtIn: boolean;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  value: TValue;
}

export type StoredTemplate = StoredComponent<"full", ActiveConfiguration>;

export interface PlaylistStep {
  id: string;
  mode: ModeId;
  visual: VisualId;
  colors: ColorsId;
  camera: CameraId;
  durationSeconds: number;
  transition: TransitionId;
}

export interface Playlist {
  id: string;
  schemaVersion: number;
  name: string;
  builtIn: boolean;
  favorite: boolean;
  repeat: boolean;
  shuffle: boolean;
  steps: PlaylistStep[];
  createdAt: number;
  updatedAt: number;
}

export const MODES: BuiltInOption<ModeId>[] = [
  { id: "wander", label: "Wander" },
  { id: "path-journey", label: "Path Journey" },
  { id: "recent-activity", label: "Recent Activity" },
  { id: "forgotten-knowledge", label: "Forgotten Knowledge" },
  { id: "hub-explorer", label: "Hub Explorer" },
  { id: "hidden-gems", label: "Hidden Gems" },
  { id: "cluster-journey", label: "Cluster Journey" },
  { id: "random-discovery", label: "Random Discovery" }
];

export const VISUALS: BuiltInOption<VisualId>[] = [
  { id: "minimal", label: "Minimal" },
  { id: "constellation", label: "Constellation" },
  { id: "deep-space", label: "Deep Space" },
  { id: "neon", label: "Neon" },
  { id: "soft-glow", label: "Soft Glow" },
  { id: "clean", label: "Clean" },
  { id: "star-chart", label: "Star Chart" },
  { id: "galaxy-spiral", label: "Galaxy Spiral" },
  { id: "matrix-grid", label: "Matrix Grid" },
  { id: "blueprint-lines", label: "Blueprint Lines" },
  { id: "orbital-rings", label: "Orbital Rings" },
  { id: "city-network", label: "City Network" },
  { id: "data-stream", label: "Data Stream" },
  { id: "heatmap-cloud", label: "Heatmap Cloud" },
  { id: "paper-map", label: "Paper Map" },
  { id: "library-index", label: "Library Index" },
  { id: "zen-stones", label: "Zen Stones" },
  { id: "crystal-lattice", label: "Crystal Lattice" },
  { id: "solar-orbits", label: "Solar Orbits" },
  { id: "terminal-blocks", label: "Terminal Blocks" },
  { id: "red-scanner", label: "Red Scanner" },
  { id: "ocean-bubbles", label: "Ocean Bubbles" },
  { id: "prism-shards", label: "Prism Shards" },
  { id: "radar-sweep", label: "Radar Sweep" },
  { id: "topographic", label: "Topographic" },
  { id: "circuit-board", label: "Circuit Board" }
];

export const COLORS: BuiltInOption<ColorsId>[] = [
  { id: "aurora", label: "Aurora" },
  { id: "rainbow-flow", label: "Rainbow Flow" },
  { id: "deep-ocean", label: "Deep Ocean" },
  { id: "monochrome", label: "Monochrome" },
  { id: "sunset", label: "Sunset" },
  { id: "forest", label: "Forest" },
  { id: "cluster-based", label: "Cluster Based" },
  { id: "pastel", label: "Pastel" },
  { id: "glacier", label: "Glacier" },
  { id: "ember", label: "Ember" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "rose-garden", label: "Rose Garden" },
  { id: "vaporwave", label: "Vaporwave" },
  { id: "solarized", label: "Solarized" },
  { id: "nord", label: "Nord" },
  { id: "graphite", label: "Graphite" },
  { id: "high-contrast", label: "High Contrast" },
  { id: "candy", label: "Candy" },
  { id: "midnight-gold", label: "Midnight Gold" },
  { id: "violet-storm", label: "Violet Storm" },
  { id: "mint", label: "Mint" },
  { id: "lava", label: "Lava" },
  { id: "arctic", label: "Arctic" },
  { id: "meadow", label: "Meadow" },
  { id: "ocean-sunset", label: "Ocean Sunset" },
  { id: "ink", label: "Ink" },
  { id: "pearl", label: "Pearl" },
  { id: "city-nights", label: "City Nights" },
  { id: "star-map", label: "Star Map" },
  { id: "dark-mode", label: "Dark Mode" },
  { id: "zen-garden", label: "Zen Garden" },
  { id: "blueprint", label: "Blueprint" },
  { id: "solar-system", label: "Solar System" },
  { id: "library-night", label: "Library Night" },
  { id: "crystal", label: "Crystal" },
  { id: "terminal-amber", label: "Terminal Amber" },
  { id: "red-alert", label: "Red Alert" },
  { id: "ocean-depths", label: "Ocean Depths" },
  { id: "paper-minimal", label: "Paper Minimal" },
  { id: "galaxy-core", label: "Galaxy Core" },
  { id: "heatmap", label: "Heatmap" },
  { id: "age-gradient", label: "Age Gradient" },
  { id: "cluster-neon", label: "Cluster Neon" },
  { id: "focus-fade", label: "Focus Fade" },
  { id: "signal-strength", label: "Signal Strength" },
  { id: "night-vision", label: "Night Vision" },
  { id: "archive-dust", label: "Archive Dust" },
  { id: "prism-flow", label: "Prism Flow" },
  { id: "constellation-white", label: "Constellation White" },
  { id: "infrared", label: "Infrared" }
];

export const CAMERAS: BuiltInOption<CameraId>[] = [
  { id: "static", label: "Static" },
  { id: "calm", label: "Calm" },
  { id: "floating", label: "Floating" },
  { id: "cinematic", label: "Cinematic" },
  { id: "dynamic", label: "Dynamic" },
  { id: "fast", label: "Fast" }
];

export const TRANSITIONS: BuiltInOption<TransitionId>[] = [
  { id: "instant", label: "Instant" },
  { id: "crossfade", label: "Crossfade" },
  { id: "color-morph", label: "Color Morph" },
  { id: "smooth-camera", label: "Smooth Camera" },
  { id: "fade-to-black", label: "Fade to Black" }
];

export const PATH_ANIMATIONS: BuiltInOption<PathAnimationId>[] = [
  { id: "single-pulse", label: "Single Pulse" },
  { id: "comet", label: "Comet Trail" },
  { id: "bidirectional", label: "Bidirectional" },
  { id: "wave", label: "Traveling Wave" },
  { id: "sparkle-train", label: "Sparkle Train" },
  { id: "traffic-flow", label: "Traffic Flow" },
  { id: "data-rain", label: "Data Rain" },
  { id: "signal-burst", label: "Signal Burst" }
];

export const PULSE_STYLES: BuiltInOption<PulseStyleId>[] = [
  { id: "orb", label: "Orb" },
  { id: "ring", label: "Ring" },
  { id: "double-ring", label: "Double Ring" },
  { id: "diamond", label: "Diamond" },
  { id: "square-packet", label: "Square Packet" },
  { id: "hollow-dot", label: "Hollow Dot" },
  { id: "glow-bloom", label: "Glow Bloom" },
  { id: "star-spark", label: "Star Spark" },
  { id: "scanner", label: "Scanner" },
  { id: "ripple", label: "Ripple" },
  { id: "car-lights", label: "Car Lights" }
];

export const BACKGROUNDS: BuiltInOption<BackgroundId>[] = [
  { id: "theme", label: "Obsidian Theme" },
  { id: "solid-dark", label: "Solid Dark" },
  { id: "solid-light", label: "Solid Light" },
  { id: "gradient", label: "Gradient" },
  { id: "animated-gradient", label: "Animated Gradient" },
  { id: "stars", label: "Stars" },
  { id: "deep-space", label: "Deep Space" },
  { id: "transparent", label: "Transparent" },
  { id: "aurora", label: "Aurora" },
  { id: "nebula", label: "Nebula" },
  { id: "paper", label: "Paper" },
  { id: "midnight", label: "Midnight" },
  { id: "dawn", label: "Dawn" },
  { id: "matrix", label: "Matrix" },
  { id: "star-map", label: "Star Map" },
  { id: "dark-mode", label: "Dark Mode" },
  { id: "zen-garden", label: "Zen Garden" },
  { id: "blueprint", label: "Blueprint" },
  { id: "solar-system", label: "Solar System" },
  { id: "library-night", label: "Library Night" },
  { id: "crystal", label: "Crystal" },
  { id: "terminal-amber", label: "Terminal Amber" },
  { id: "red-alert", label: "Red Alert" },
  { id: "ocean-depths", label: "Ocean Depths" },
  { id: "paper-minimal", label: "Paper Minimal" },
  { id: "galaxy-core", label: "Galaxy Core" }
];

export const NODE_MOVEMENT_STYLES: BuiltInOption<NodeMovementStyleId>[] = [
  { id: "gentle-float", label: "Gentle Float" },
  { id: "drift", label: "Random Drift" },
  { id: "orbit", label: "Orbit" },
  { id: "breathing", label: "Breathing" },
  { id: "scatter", label: "Scatter" },
  { id: "swarm", label: "Swarm" },
  { id: "jitter", label: "Jitter" },
  { id: "spiral", label: "Spiral" },
  { id: "chaos", label: "Chaos" }
];

export const CLICK_ANIMATIONS: BuiltInOption<ClickAnimationId>[] = [
  { id: "ripple", label: "Ripple" },
  { id: "double-ripple", label: "Double Ripple" },
  { id: "spark", label: "Spark" },
  { id: "starburst", label: "Starburst" },
  { id: "halo", label: "Halo" },
  { id: "pulse-ring", label: "Pulse Ring" },
  { id: "scanner", label: "Scanner" },
  { id: "diamond-pop", label: "Diamond Pop" },
  { id: "orbit-dots", label: "Orbit Dots" },
  { id: "shockwave", label: "Shockwave" },
  { id: "comet-bloom", label: "Comet Bloom" },
  { id: "none", label: "None" }
];
