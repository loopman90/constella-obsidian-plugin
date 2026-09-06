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
  | "random-discovery"
  | "deep-dive"
  | "quick-scan"
  | "review-loop"
  | "idea-hop"
  | "bridge-finder"
  | "cluster-sweep"
  | "orphan-hunt"
  | "timeline-run"
  | "oldest-first"
  | "newest-first"
  | "dense-route"
  | "sparse-route"
  | "balanced-tour"
  | "serendipity"
  | "research-trail"
  | "writing-map"
  | "project-map"
  | "tag-surf"
  | "folder-walk"
  | "memory-lane"
  | "review-queue"
  | "cluster-compare"
  | "bridge-notes"
  | "tag-drift"
  | "orphan-rescue"
  | "writing-flow"
  | "daily-reflection"
  | "deep-archive";

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
  | "circuit-board"
  | "fog-of-knowledge"
  | "ink-map"
  | "neural-bloom"
  | "satellite-view"
  | "glass-minimal"
  | "academic-light"
  | "timeline-map"
  | "mind-palace"
  | "circuit-minimal"
  | "archive-fog"
  | "focus-lens"
  | "thread-weaver"
  | "research-board"
  | "signal-radar";
export type ColorsId =
  | "aurora"
  | "aqua-mint"
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
  | "infrared"
  | "sepia-archive"
  | "polar-night"
  | "electric-lime"
  | "soft-lavender"
  | "copper-blue"
  | "notebook-blue"
  | "ruby-graph"
  | "moss-gold";
export type CameraId =
  | "static"
  | "calm"
  | "floating"
  | "cinematic"
  | "dynamic"
  | "fast"
  | "custom"
  | "focus-lock"
  | "slow-drift"
  | "wide-orbit"
  | "close-orbit"
  | "breathing-zoom"
  | "presenter-pan"
  | "scanline"
  | "radar-orbit"
  | "city-cruise"
  | "data-chase"
  | "cluster-hop"
  | "edge-glide"
  | "constellation-tour"
  | "zen-still"
  | "paper-follow"
  | "matrix-rush"
  | "galaxy-dive"
  | "micro-wander"
  | "overview-pulse"
  | "second-screen-calm";
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
export type DrawingLineStyleId =
  | "trace"
  | "reverse-trace"
  | "center-out"
  | "dashed-march"
  | "lightning"
  | "city-lights"
  | "data-packets"
  | "scanner-sweep"
  | "double-trace"
  | "constellation-sketch"
  | "radar-fan";
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
    includeFloatingNotes: boolean;
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
    glowStrength: number;
    backgroundEffectsEnabled: boolean;
    pulseAmount: number;
    particleAmount: number;
    particleSpeed: number;
    drawingLinesEnabled: boolean;
    drawingLineSpeed: number;
    drawingLineStyle: DrawingLineStyleId;
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
  quickUi: {
    showPlayback: boolean;
    showGraphScope: boolean;
    showMode: boolean;
    showVisual: boolean;
    showColors: boolean;
    showCamera: boolean;
    showSpeed: boolean;
    showIntensity: boolean;
    showRandomize: boolean;
    showSave: boolean;
    showPngExport: boolean;
    showFullscreen: boolean;
    showSecondScreen: boolean;
    showSettings: boolean;
    showCollapse: boolean;
  };
  tools: {
    showMiniMap: boolean;
    showSearchResults: boolean;
    showGraphHealth: boolean;
    enableSavedViews: boolean;
    enableColorRules: boolean;
    colorRulesText: string;
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
  { id: "random-discovery", label: "Random Discovery" },
  { id: "deep-dive", label: "Deep Dive" },
  { id: "quick-scan", label: "Quick Scan" },
  { id: "review-loop", label: "Review Loop" },
  { id: "idea-hop", label: "Idea Hop" },
  { id: "bridge-finder", label: "Bridge Finder" },
  { id: "cluster-sweep", label: "Cluster Sweep" },
  { id: "orphan-hunt", label: "Orphan Hunt" },
  { id: "timeline-run", label: "Timeline Run" },
  { id: "oldest-first", label: "Oldest First" },
  { id: "newest-first", label: "Newest First" },
  { id: "dense-route", label: "Dense Route" },
  { id: "sparse-route", label: "Sparse Route" },
  { id: "balanced-tour", label: "Balanced Tour" },
  { id: "serendipity", label: "Serendipity" },
  { id: "research-trail", label: "Research Trail" },
  { id: "writing-map", label: "Writing Map" },
  { id: "project-map", label: "Project Map" },
  { id: "tag-surf", label: "Tag Surf" },
  { id: "folder-walk", label: "Folder Walk" },
  { id: "memory-lane", label: "Memory Lane" },
  { id: "review-queue", label: "Review Queue" },
  { id: "cluster-compare", label: "Cluster Compare" },
  { id: "bridge-notes", label: "Bridge Notes" },
  { id: "tag-drift", label: "Tag Drift" },
  { id: "orphan-rescue", label: "Orphan Rescue" },
  { id: "writing-flow", label: "Writing Flow" },
  { id: "daily-reflection", label: "Daily Reflection" },
  { id: "deep-archive", label: "Deep Archive" }
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
  { id: "circuit-board", label: "Circuit Board" },
  { id: "fog-of-knowledge", label: "Fog of Knowledge" },
  { id: "ink-map", label: "Ink Map" },
  { id: "neural-bloom", label: "Neural Bloom" },
  { id: "satellite-view", label: "Satellite View" },
  { id: "glass-minimal", label: "Glass Minimal" },
  { id: "academic-light", label: "Academic Light" },
  { id: "timeline-map", label: "Timeline Map" },
  { id: "mind-palace", label: "Mind Palace" },
  { id: "circuit-minimal", label: "Circuit Minimal" },
  { id: "archive-fog", label: "Archive Fog" },
  { id: "focus-lens", label: "Focus Lens" },
  { id: "thread-weaver", label: "Thread Weaver" },
  { id: "research-board", label: "Research Board" },
  { id: "signal-radar", label: "Signal Radar" }
];

export const COLORS: BuiltInOption<ColorsId>[] = [
  { id: "aurora", label: "Aurora" },
  { id: "aqua-mint", label: "Aqua Mint" },
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
  { id: "infrared", label: "Infrared" },
  { id: "sepia-archive", label: "Sepia Archive" },
  { id: "polar-night", label: "Polar Night" },
  { id: "electric-lime", label: "Electric Lime" },
  { id: "soft-lavender", label: "Soft Lavender" },
  { id: "copper-blue", label: "Copper Blue" },
  { id: "notebook-blue", label: "Notebook Blue" },
  { id: "ruby-graph", label: "Ruby Graph" },
  { id: "moss-gold", label: "Moss & Gold" }
];

export const CAMERAS: BuiltInOption<CameraId>[] = [
  { id: "static", label: "Static" },
  { id: "calm", label: "Calm" },
  { id: "floating", label: "Floating" },
  { id: "cinematic", label: "Cinematic" },
  { id: "dynamic", label: "Dynamic" },
  { id: "fast", label: "Fast" },
  { id: "focus-lock", label: "Focus Lock" },
  { id: "slow-drift", label: "Slow Drift" },
  { id: "wide-orbit", label: "Wide Orbit" },
  { id: "close-orbit", label: "Close Orbit" },
  { id: "breathing-zoom", label: "Breathing Zoom" },
  { id: "presenter-pan", label: "Presenter Pan" },
  { id: "scanline", label: "Scanline" },
  { id: "radar-orbit", label: "Radar Orbit" },
  { id: "city-cruise", label: "City Cruise" },
  { id: "data-chase", label: "Data Chase" },
  { id: "cluster-hop", label: "Cluster Hop" },
  { id: "edge-glide", label: "Edge Glide" },
  { id: "constellation-tour", label: "Constellation Tour" },
  { id: "zen-still", label: "Zen Still" },
  { id: "paper-follow", label: "Paper Follow" },
  { id: "matrix-rush", label: "Matrix Rush" },
  { id: "galaxy-dive", label: "Galaxy Dive" },
  { id: "micro-wander", label: "Micro Wander" },
  { id: "overview-pulse", label: "Overview Pulse" },
  { id: "second-screen-calm", label: "Second Screen Calm" }
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

export const DRAWING_LINE_STYLES: BuiltInOption<DrawingLineStyleId>[] = [
  { id: "trace", label: "Trace" },
  { id: "reverse-trace", label: "Reverse Trace" },
  { id: "center-out", label: "Center Out" },
  { id: "dashed-march", label: "Dashed March" },
  { id: "lightning", label: "Lightning" },
  { id: "city-lights", label: "City Lights" },
  { id: "data-packets", label: "Data Packets" },
  { id: "scanner-sweep", label: "Scanner Sweep" },
  { id: "double-trace", label: "Double Trace" },
  { id: "constellation-sketch", label: "Constellation Sketch" },
  { id: "radar-fan", label: "Radar Fan" }
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
