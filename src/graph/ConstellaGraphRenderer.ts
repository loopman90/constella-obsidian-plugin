import type { App } from "obsidian";
import type { ActiveConfiguration, ClickAnimationId, GraphData, GraphNode, Viewport } from "../core/types";
import { PerformanceManager } from "../performance/PerformanceManager";

interface RendererOptions {
  onNodeSelected: (node: GraphNode | null) => void;
  onNodeOpened: (node: GraphNode) => void;
}

interface PointerState {
  dragging: boolean;
  lastX: number;
  lastY: number;
  moved: boolean;
}

interface ClickEffect {
  id: number;
  x: number;
  y: number;
  startedAt: number;
  color: string;
  style: ClickAnimationId;
}

type VisualEdgeMode = "line" | "dash" | "curve" | "double" | "orthogonal";
type VisualNodeShape = "circle" | "ring" | "square" | "diamond" | "hex" | "star" | "packet" | "bar" | "stone" | "shard";

interface VisualProfile {
  edgeMode: VisualEdgeMode;
  nodeShape: VisualNodeShape;
  edgeMultiplier: number;
  nodeMultiplier: number;
  glowMultiplier: number;
  labelThreshold: number;
}

interface CameraProfile {
  followStrength: number;
  zoomMode: "none" | "fit" | "close" | "wide" | "pulse";
  orbit: number;
  drift: number;
  shake: number;
  lead: number;
}

export class ConstellaGraphRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly performanceManager = new PerformanceManager();
  private animationFrame: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private graph: GraphData = { nodes: [], edges: [] };
  private nodeById = new Map<string, GraphNode>();
  private config: ActiveConfiguration;
  private viewport: Viewport = { x: 0, y: 0, scale: 1 };
  private selectedNode: GraphNode | null = null;
  private hoverNode: GraphNode | null = null;
  private hoverNeighborIds = new Set<string>();
  private journeyPath: string[] = [];
  private journeyIndex = 0;
  private pointer: PointerState = { dragging: false, lastX: 0, lastY: 0, moved: false };
  private clickEffects: ClickEffect[] = [];
  private nextClickEffectId = 1;
  private lastFrame = performance.now();
  private time = 0;
  private fps = 0;
  private fpsFrameCount = 0;
  private fpsStartedAt = performance.now();

  constructor(
    private readonly app: App,
    private readonly containerEl: HTMLElement,
    config: ActiveConfiguration,
    private readonly options: RendererOptions
  ) {
    this.config = config;
    this.canvas = containerEl.createEl("canvas", { cls: "constella-canvas" });
    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("Constella could not initialize a 2D canvas context.");
    }
    this.ctx = context;
    this.bindEvents();
    this.resize();
    this.start();
  }

  setGraph(graph: GraphData): void {
    this.graph = graph;
    this.nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    this.hoverNode = null;
    this.hoverNeighborIds = new Set();
    this.selectedNode = null;
    this.options.onNodeSelected(null);
    this.centerGraph();
  }

  setConfiguration(config: ActiveConfiguration): void {
    this.config = config;
  }

  setSelectedNode(node: GraphNode | null): void {
    this.selectedNode = node;
  }

  setJourney(path: string[], currentIndex: number): void {
    this.journeyPath = path;
    this.journeyIndex = currentIndex;
  }

  exportPng(): Promise<Blob> {
    this.resize();
    this.draw();
    return new Promise((resolve, reject) => {
      this.canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Constella could not create a PNG export."));
      }, "image/png");
    });
  }

  start(): void {
    if (this.animationFrame !== null) {
      return;
    }
    this.lastFrame = performance.now();
    this.animationFrame = window.requestAnimationFrame(this.render);
  }

  stop(): void {
    if (this.animationFrame !== null) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  destroy(): void {
    this.stop();
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("dblclick", this.onDoubleClick);
    this.canvas.remove();
  }

  private bindEvents(): void {
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.canvas.addEventListener("dblclick", this.onDoubleClick);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.containerEl);
  }

  private readonly render = (now: number): void => {
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.updateFps(now);
    const motionScale = this.config.motion.reduceMotion ? 0.16 : 1;
    this.time += dt * this.config.motion.animationSpeed * motionScale;
    if (!this.config.motion.reduceMotion) {
      this.step(dt);
    }
    this.followCamera(dt * motionScale);
    this.draw();
    this.animationFrame = window.requestAnimationFrame(this.render);
  };

  private step(dt: number): void {
    if (!this.config.motion.nodeMovementEnabled || this.graph.nodes.length === 0) {
      return;
    }

    const strength = (4 + this.config.motion.nodeMovementStrength * 42) * this.config.motion.visualIntensity;
    const speed = 0.25 + this.config.motion.nodeMovementSpeed * 3.5 + this.config.motion.animationSpeed;
    const pinned = new Set(this.config.interaction.pinnedNodeIds);
    this.graph.nodes.forEach((node, index) => {
      if (pinned.has(node.id)) {
        node.vx = 0;
        node.vy = 0;
        return;
      }
      const seedA = index * 1.91;
      const seedB = index * 2.37;
      switch (this.config.motion.nodeMovementStyle) {
        case "drift":
          node.vx += Math.sin(this.time * speed + seedA) * strength * 0.16 * dt;
          node.vy += Math.cos(this.time * speed * 0.8 + seedB) * strength * 0.16 * dt;
          this.applyVelocity(node, dt, 0.975);
          break;
        case "orbit": {
          const angle = this.time * speed * 0.45 + seedA;
          const orbit = strength * 0.018;
          node.x += Math.cos(angle) * orbit;
          node.y += Math.sin(angle) * orbit;
          break;
        }
        case "breathing": {
          const fromCenter = Math.max(1, Math.hypot(node.x, node.y));
          const pulse = Math.sin(this.time * speed + seedA) * strength * 0.018 * dt;
          node.x += (node.x / fromCenter) * pulse * 60;
          node.y += (node.y / fromCenter) * pulse * 60;
          break;
        }
        case "scatter":
          node.vx += Math.sin(this.time * speed * 1.7 + seedA) * strength * 0.32 * dt;
          node.vy += Math.sin(this.time * speed * 1.3 + seedB) * strength * 0.32 * dt;
          this.applyVelocity(node, dt, 0.94);
          break;
        case "swarm": {
          const clusterPull = (node.clusterId % 2 === 0 ? 1 : -1) * strength * 0.05 * dt;
          node.vx += Math.cos(this.time * speed + node.clusterId) * clusterPull;
          node.vy += Math.sin(this.time * speed + node.clusterId) * clusterPull;
          node.vx += Math.sin(this.time * speed * 2 + seedA) * strength * 0.08 * dt;
          node.vy += Math.cos(this.time * speed * 2 + seedB) * strength * 0.08 * dt;
          this.applyVelocity(node, dt, 0.965);
          break;
        }
        case "jitter":
          node.x += (Math.sin(this.time * speed * 12 + seedA) + Math.sin(this.time * speed * 7 + seedB)) * strength * 0.035 * dt * 60;
          node.y += (Math.cos(this.time * speed * 10 + seedB) + Math.sin(this.time * speed * 6 + seedA)) * strength * 0.035 * dt * 60;
          break;
        case "spiral": {
          const radius = Math.max(1, Math.hypot(node.x, node.y));
          const tangentX = -node.y / radius;
          const tangentY = node.x / radius;
          const spiral = strength * 0.03 * dt * 60;
          node.x += tangentX * spiral + Math.sin(this.time * speed + seedA) * strength * 0.006 * dt * 60;
          node.y += tangentY * spiral + Math.cos(this.time * speed + seedB) * strength * 0.006 * dt * 60;
          break;
        }
        case "chaos":
          node.vx += (Math.sin(this.time * speed * 4.1 + seedA) + Math.cos(this.time * speed * 2.3 + seedB)) * strength * 0.24 * dt;
          node.vy += (Math.cos(this.time * speed * 3.7 + seedB) - Math.sin(this.time * speed * 2.9 + seedA)) * strength * 0.24 * dt;
          this.applyVelocity(node, dt, 0.91);
          break;
        case "gentle-float":
        default:
          node.x += Math.sin(this.time * speed + seedA) * strength * 0.018 * dt * 60;
          node.y += Math.cos(this.time * speed + seedB) * strength * 0.018 * dt * 60;
          break;
      }
    });
  }

  private applyVelocity(node: GraphNode, dt: number, damping: number): void {
    node.x += node.vx * dt * 60;
    node.y += node.vy * dt * 60;
    node.vx *= damping;
    node.vy *= damping;
  }

  private draw(): void {
    const width = this.canvas.width / window.devicePixelRatio;
    const height = this.canvas.height / window.devicePixelRatio;
    this.ctx.clearRect(0, 0, width, height);
    this.drawBackground(width, height);

    this.ctx.save();
    this.ctx.translate(width / 2 + this.viewport.x, height / 2 + this.viewport.y);
    this.ctx.scale(this.viewport.scale, this.viewport.scale);
    this.drawEdges();
    this.drawPathPreview();
    this.drawNodes();
    this.drawClickEffects();
    this.ctx.restore();

    if (this.graph.nodes.length === 0) {
      this.drawEmptyState(width, height);
    }
    this.drawHud(width, height);
  }

  private drawBackground(width: number, height: number): void {
    const colors = this.getPalette();
    const background = this.getBackground(colors.backgroundA, colors.backgroundB);
    const intensity = this.config.background.intensity;

    if (background.transparent) {
      this.ctx.clearRect(0, 0, width, height);
    } else if (background.gradient) {
      const drift = background.animated ? Math.sin(this.time * 0.18) * width * 0.18 : 0;
      const gradient = this.ctx.createLinearGradient(drift, 0, width - drift, height);
      gradient.addColorStop(0, background.a);
      gradient.addColorStop(0.5, background.mid ?? background.a);
      gradient.addColorStop(1, background.b);
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, width, height);
    } else {
      this.ctx.fillStyle = background.a;
      this.ctx.fillRect(0, 0, width, height);
    }

    if (this.config.motion.backgroundEffectsEnabled && this.config.visual !== "minimal" && intensity > 0.02) {
      this.ctx.save();
      this.ctx.globalAlpha = intensity;
      if (background.nebula) {
        this.drawNebula(width, height, colors.edgeActive);
      }
      if (background.stars) {
        this.drawStarField(width, height, colors.edge);
      }
      if (background.matrix) {
        this.drawMatrixRain(width, height, colors.edgeActive);
      }
      if (background.starMap) {
        this.drawStarMapOverlay(width, height, colors.edgeActive);
      }
      this.drawVisualBackdrop(width, height, colors);
      this.ctx.restore();
      this.ctx.globalAlpha = 1;
    }
  }

  private getBackground(paletteA: string, paletteB: string): {
    a: string;
    b: string;
    mid?: string;
    gradient: boolean;
    animated: boolean;
    stars: boolean;
    nebula: boolean;
    matrix: boolean;
    starMap: boolean;
    transparent: boolean;
  } {
    switch (this.config.visual) {
      case "ink-map":
        return { a: "#f8f5ec", mid: "#eee8d8", b: "#ded3bd", gradient: true, animated: false, stars: false, nebula: false, matrix: false, starMap: false, transparent: false };
      case "academic-light":
        return { a: "#fbfaf6", mid: "#f2efe6", b: "#e8e1d2", gradient: true, animated: false, stars: false, nebula: false, matrix: false, starMap: false, transparent: false };
      case "satellite-view":
        return { a: "#020617", mid: "#071426", b: "#0a1f2e", gradient: true, animated: false, stars: true, nebula: false, matrix: false, starMap: false, transparent: false };
      case "glass-minimal":
        return { a: "#090b10", mid: "#111827", b: "#18202c", gradient: true, animated: false, stars: false, nebula: false, matrix: false, starMap: false, transparent: false };
      case "fog-of-knowledge":
        return { a: "#070b12", mid: "#111827", b: "#1e293b", gradient: true, animated: false, stars: true, nebula: true, matrix: false, starMap: false, transparent: false };
      case "neural-bloom":
        return { a: "#070414", mid: "#11143a", b: "#1e1b4b", gradient: true, animated: true, stars: true, nebula: true, matrix: false, starMap: false, transparent: false };
      default:
        break;
    }

    switch (this.config.background.style) {
      case "theme":
        return { a: this.cssColor("--background-primary", "#111113"), b: this.cssColor("--background-primary", "#111113"), gradient: false, animated: false, stars: false, nebula: false, matrix: false, starMap: false, transparent: false };
      case "solid-dark":
        return { a: "#080b12", b: "#080b12", gradient: false, animated: false, stars: false, nebula: false, matrix: false, starMap: false, transparent: false };
      case "solid-light":
        return { a: "#f8fafc", b: "#f8fafc", gradient: false, animated: false, stars: false, nebula: false, matrix: false, starMap: false, transparent: false };
      case "gradient":
        return { a: paletteA, b: paletteB, gradient: true, animated: false, stars: false, nebula: false, matrix: false, starMap: false, transparent: false };
      case "animated-gradient":
        return { a: paletteA, mid: "#1e1b4b", b: paletteB, gradient: true, animated: true, stars: false, nebula: true, matrix: false, starMap: false, transparent: false };
      case "stars":
        return { a: "#050816", b: "#111827", gradient: true, animated: false, stars: true, nebula: false, matrix: false, starMap: false, transparent: false };
      case "deep-space":
        return { a: "#030712", mid: "#10172a", b: "#1e1b4b", gradient: true, animated: false, stars: true, nebula: true, matrix: false, starMap: false, transparent: false };
      case "transparent":
        return { a: "transparent", b: "transparent", gradient: false, animated: false, stars: false, nebula: false, matrix: false, starMap: false, transparent: true };
      case "aurora":
        return { a: "#06111f", mid: "#12342d", b: "#2e1065", gradient: true, animated: true, stars: true, nebula: true, matrix: false, starMap: false, transparent: false };
      case "nebula":
        return { a: "#12091f", mid: "#172554", b: "#3b0764", gradient: true, animated: true, stars: true, nebula: true, matrix: false, starMap: false, transparent: false };
      case "paper":
        return { a: "#faf7ef", b: "#ece7da", gradient: true, animated: false, stars: false, nebula: false, matrix: false, starMap: false, transparent: false };
      case "midnight":
        return { a: "#020617", mid: "#111827", b: "#0f172a", gradient: true, animated: false, stars: true, nebula: false, matrix: false, starMap: false, transparent: false };
      case "dawn":
        return { a: "#fff7ed", mid: "#fde68a", b: "#bfdbfe", gradient: true, animated: false, stars: false, nebula: false, matrix: false, starMap: false, transparent: false };
      case "matrix":
        return { a: "#020a06", b: "#03140c", gradient: true, animated: false, stars: false, nebula: false, matrix: true, starMap: false, transparent: false };
      case "star-map":
        return { a: "#020617", mid: "#081426", b: "#10233f", gradient: true, animated: true, stars: true, nebula: false, matrix: false, starMap: true, transparent: false };
      case "dark-mode":
        return { a: "#050507", mid: "#0b0d12", b: "#111827", gradient: true, animated: false, stars: false, nebula: false, matrix: false, starMap: false, transparent: false };
      case "zen-garden":
        return { a: "#07140d", mid: "#102216", b: "#1b2b1c", gradient: true, animated: false, stars: false, nebula: false, matrix: false, starMap: false, transparent: false };
      case "blueprint":
        return { a: "#061529", mid: "#082f49", b: "#0c4a6e", gradient: true, animated: false, stars: false, nebula: false, matrix: false, starMap: true, transparent: false };
      case "solar-system":
        return { a: "#030712", mid: "#1f1708", b: "#0f172a", gradient: true, animated: true, stars: true, nebula: false, matrix: false, starMap: false, transparent: false };
      case "library-night":
        return { a: "#140f0a", mid: "#1f1a10", b: "#172016", gradient: true, animated: false, stars: false, nebula: false, matrix: false, starMap: false, transparent: false };
      case "crystal":
        return { a: "#071827", mid: "#26315f", b: "#4c1d95", gradient: true, animated: true, stars: true, nebula: true, matrix: false, starMap: false, transparent: false };
      case "terminal-amber":
        return { a: "#090602", mid: "#1a1003", b: "#2a1702", gradient: true, animated: false, stars: false, nebula: false, matrix: true, starMap: false, transparent: false };
      case "red-alert":
        return { a: "#080202", mid: "#210606", b: "#450a0a", gradient: true, animated: true, stars: false, nebula: true, matrix: false, starMap: false, transparent: false };
      case "ocean-depths":
        return { a: "#020617", mid: "#06233a", b: "#042f2e", gradient: true, animated: true, stars: true, nebula: true, matrix: false, starMap: false, transparent: false };
      case "paper-minimal":
        return { a: "#fbf7ed", mid: "#f1ead8", b: "#e7dcc4", gradient: true, animated: false, stars: false, nebula: false, matrix: false, starMap: false, transparent: false };
      case "galaxy-core":
        return { a: "#070018", mid: "#3b0764", b: "#1e1b4b", gradient: true, animated: true, stars: true, nebula: true, matrix: false, starMap: false, transparent: false };
      default:
        return { a: paletteA, b: paletteB, gradient: true, animated: false, stars: true, nebula: true, matrix: false, starMap: false, transparent: false };
    }
  }

  private drawEdges(): void {
    const colors = this.getPalette();
    const profile = this.visualProfile();
    this.ctx.lineCap = "round";

    for (const edge of this.graph.edges) {
      const source = this.nodeById.get(edge.source);
      const target = this.nodeById.get(edge.target);
      if (!source || !target) {
        continue;
      }

      const selected = this.selectedNode?.id === source.id || this.selectedNode?.id === target.id;
      const hovered = this.hoverNode?.id === source.id || this.hoverNode?.id === target.id;
      const activeJourneyEdge = this.isJourneyEdge(source.id, target.id);
      const lineProgress = this.getLineDrawProgress(edge.id, activeJourneyEdge);
      const drawTarget = this.pointOnEdge(source, target, lineProgress);
      const edgeColor = this.edgeColor(edge, selected || hovered, activeJourneyEdge, colors.edge, colors.edgeActive);
      this.ctx.strokeStyle = edgeColor;
      this.ctx.globalAlpha = this.edgeAlpha(edge, selected || hovered, activeJourneyEdge) * Math.max(0.24, lineProgress);
      const thickness = 0.7 + this.config.display.edgeThickness * 1.8;
      this.ctx.lineWidth = (activeJourneyEdge ? 2.4 : selected || hovered ? 1.8 : this.edgeWidth(edge)) * thickness * profile.edgeMultiplier / this.viewport.scale;
      this.drawDrawingLine(source, target, drawTarget, edge.id, edgeColor, profile.edgeMode, lineProgress);

      if (this.config.motion.connectionPulsesEnabled && lineProgress > 0.35 && (activeJourneyEdge || Math.random() < 0.002 * this.config.motion.pulseAmount)) {
        this.drawPathAnimation(source, target, edgeColor, activeJourneyEdge);
      }
    }

    this.ctx.globalAlpha = 1;
  }

  private drawNodes(): void {
    const colors = this.getPalette();
    const profile = this.visualProfile();
    const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 30;

    this.graph.nodes.forEach((node, index) => {
      const selected = this.selectedNode?.id === node.id;
      const hovered = this.hoverNode?.id === node.id;
      const neighbor = this.hoverNeighborIds.has(node.id);
      const currentJourney = this.journeyPath[this.journeyIndex] === node.id;
      const visitedJourney = this.journeyPath.includes(node.id);
      const recent = node.lastModified > recentCutoff;
      const focusFactor = this.focusFactor(node);
      const bloomFactor = this.clusterBloomFactor(node);
      const hueShift = this.config.colors === "rainbow-flow" || this.config.colors === "prism-flow" ? (this.time * 90 + index * 19) % 360 : null;
      const clusterColor = this.config.colors === "cluster-based" || this.config.colors === "cluster-neon" ? this.clusterColor(node.clusterId) : null;
      const dynamicColor = this.dynamicNodeColor(node, index, recent);
      const fill = clusterColor ?? (hueShift === null ? (recent ? colors.nodeRecent : colors.node) : `hsl(${hueShift}, 86%, 64%)`);
      const nodeFill = dynamicColor ?? fill;
      const radius = this.nodeRadius(node) * profile.nodeMultiplier;
      const dimmedByHover = this.hoverNode && !hovered && !neighbor && !selected;
      const glowStrength = this.config.motion.glowEnabled ? Math.max(0.12, this.config.motion.glowStrength) * Math.max(0.7, profile.glowMultiplier) * bloomFactor : 0;
      const glowRadius = radius * (currentJourney ? 6.8 : selected || hovered ? 5.2 : 3.2) * Math.max(0.35, this.config.motion.visualIntensity) * glowStrength;

      if (this.config.motion.glowEnabled && glowRadius > radius && !dimmedByHover) {
        const glow = this.ctx.createRadialGradient(node.x, node.y, Math.max(0, radius * 0.2), node.x, node.y, glowRadius);
        glow.addColorStop(0, currentJourney || selected ? colors.nodeActive : nodeFill);
        glow.addColorStop(0.35, currentJourney || selected ? colors.nodeActive : nodeFill);
        glow.addColorStop(1, "transparent");
        this.ctx.fillStyle = glow;
        const glowAlpha = 0.28 + this.config.motion.glowStrength * 0.52;
        this.ctx.globalAlpha = (currentJourney ? glowAlpha : selected || hovered ? glowAlpha * 0.86 : glowAlpha * 0.48) * focusFactor;
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.globalAlpha = (dimmedByHover ? 0.22 : 1) * focusFactor;
      this.ctx.fillStyle = currentJourney || selected ? colors.nodeActive : visitedJourney ? colors.nodeVisited : nodeFill;
      this.drawVisualNode(node, currentJourney ? radius + 3 : selected || hovered ? radius + 2 : radius, profile.nodeShape, colors.edgeActive);

      if (this.config.display.showLabels && (selected || this.viewport.scale > profile.labelThreshold)) {
        this.drawLabel(node, colors.label, selected || hovered);
      }
    });
  }

  private drawClickEffects(): void {
    if (this.clickEffects.length === 0) {
      return;
    }

    const now = performance.now();
    this.clickEffects = this.clickEffects.filter((effect) => {
      const t = Math.min(1, (now - effect.startedAt) / 900);
      if (t >= 1) {
        return false;
      }
      this.drawClickEffect(effect, t);
      return true;
    });
    this.ctx.globalAlpha = 1;
  }

  private drawVisualEdge(source: GraphNode, target: { x: number; y: number }, edgeId: string, mode: VisualEdgeMode): void {
    this.ctx.save();
    switch (mode) {
      case "dash":
        this.ctx.setLineDash([8 / this.viewport.scale, 7 / this.viewport.scale]);
        this.ctx.lineDashOffset = -this.time * 18;
        this.ctx.beginPath();
        this.ctx.moveTo(source.x, source.y);
        this.ctx.lineTo(target.x, target.y);
        this.ctx.stroke();
        break;
      case "curve": {
        const normal = this.edgeNormal(source, { ...source, ...target });
        const bend = (Math.sin(this.edgePhase(edgeId) * Math.PI * 2) * 24) / this.viewport.scale;
        const midX = (source.x + target.x) / 2 + normal.x * bend;
        const midY = (source.y + target.y) / 2 + normal.y * bend;
        this.ctx.beginPath();
        this.ctx.moveTo(source.x, source.y);
        this.ctx.quadraticCurveTo(midX, midY, target.x, target.y);
        this.ctx.stroke();
        break;
      }
      case "double": {
        const normal = this.edgeNormal(source, { ...source, ...target });
        for (const offset of [-2.2, 2.2]) {
          this.ctx.beginPath();
          this.ctx.moveTo(source.x + normal.x * offset, source.y + normal.y * offset);
          this.ctx.lineTo(target.x + normal.x * offset, target.y + normal.y * offset);
          this.ctx.stroke();
        }
        break;
      }
      case "orthogonal": {
        const turnX = source.x + (target.x - source.x) * 0.55;
        this.ctx.beginPath();
        this.ctx.moveTo(source.x, source.y);
        this.ctx.lineTo(turnX, source.y);
        this.ctx.lineTo(turnX, target.y);
        this.ctx.lineTo(target.x, target.y);
        this.ctx.stroke();
        break;
      }
      case "line":
      default:
        this.ctx.beginPath();
        this.ctx.moveTo(source.x, source.y);
        this.ctx.lineTo(target.x, target.y);
        this.ctx.stroke();
        break;
    }
    this.ctx.restore();
  }

  private drawDrawingLine(
    source: GraphNode,
    target: GraphNode,
    drawTarget: { x: number; y: number },
    edgeId: string,
    color: string,
    mode: VisualEdgeMode,
    progress: number
  ): void {
    if (!this.config.motion.drawingLinesEnabled) {
      this.drawVisualEdge(source, target, edgeId, mode);
      return;
    }

    const tipSize = Math.max(1.7, 3 / this.viewport.scale);
    const normal = this.edgeNormal(source, target);
    const fullAlpha = this.ctx.globalAlpha;
    this.ctx.save();

    switch (this.config.motion.drawingLineStyle) {
      case "reverse-trace": {
        const reverseTarget = this.pointOnEdge(target, source, progress);
        this.drawVisualEdge(target, reverseTarget, edgeId, mode);
        if (progress < 0.98) {
          this.drawPulseShape(reverseTarget.x, reverseTarget.y, color, 0.65, tipSize, source, target);
        }
        break;
      }
      case "center-out": {
        const half = progress * 0.5;
        const from = this.pointOnEdge(source, target, 0.5 - half);
        const to = this.pointOnEdge(source, target, 0.5 + half);
        this.drawSimpleLine(from, to);
        if (progress < 0.98) {
          this.drawPulseShape(from.x, from.y, color, 0.48, tipSize, source, target);
          this.drawPulseShape(to.x, to.y, color, 0.48, tipSize, source, target);
        }
        break;
      }
      case "dashed-march":
        this.ctx.setLineDash([7 / this.viewport.scale, 7 / this.viewport.scale]);
        this.ctx.lineDashOffset = -this.time * (24 + this.config.motion.drawingLineSpeed * 48);
        this.drawVisualEdge(source, drawTarget, edgeId, mode);
        if (progress < 0.98) {
          this.drawPulseShape(drawTarget.x, drawTarget.y, color, 0.55, tipSize, source, target);
        }
        break;
      case "lightning":
        this.drawLightningLine(source, drawTarget, edgeId, progress);
        if (progress < 0.98) {
          this.drawPulseShape(drawTarget.x, drawTarget.y, "#ffffff", 0.7, tipSize * 1.15, source, target);
        }
        break;
      case "city-lights":
        this.ctx.globalAlpha = fullAlpha * 0.3;
        this.drawVisualEdge(source, target, edgeId, mode);
        this.ctx.globalAlpha = fullAlpha;
        this.drawVisualEdge(source, drawTarget, edgeId, mode);
        this.drawMovingDots(source, target, color, 7, "circle", progress);
        break;
      case "data-packets":
        this.ctx.globalAlpha = fullAlpha * 0.32;
        this.drawVisualEdge(source, target, edgeId, mode);
        this.ctx.globalAlpha = fullAlpha;
        this.drawVisualEdge(source, drawTarget, edgeId, mode);
        this.drawMovingDots(source, target, color, 6, "square", progress);
        break;
      case "scanner-sweep": {
        this.ctx.globalAlpha = fullAlpha * 0.36;
        this.drawVisualEdge(source, target, edgeId, mode);
        this.ctx.globalAlpha = fullAlpha;
        this.drawVisualEdge(source, drawTarget, edgeId, mode);
        const sweep = this.pointOnEdge(source, target, progress);
        const size = Math.max(8, 14 / this.viewport.scale);
        this.ctx.beginPath();
        this.ctx.moveTo(sweep.x - normal.x * size, sweep.y - normal.y * size);
        this.ctx.lineTo(sweep.x + normal.x * size, sweep.y + normal.y * size);
        this.ctx.stroke();
        break;
      }
      case "double-trace": {
        const offset = 3 / this.viewport.scale;
        for (const side of [-1, 1]) {
          this.ctx.beginPath();
          this.ctx.moveTo(source.x + normal.x * offset * side, source.y + normal.y * offset * side);
          this.ctx.lineTo(drawTarget.x + normal.x * offset * side, drawTarget.y + normal.y * offset * side);
          this.ctx.stroke();
        }
        if (progress < 0.98) {
          this.drawPulseShape(drawTarget.x, drawTarget.y, color, 0.58, tipSize, source, target);
        }
        break;
      }
      case "constellation-sketch":
        this.ctx.globalAlpha = fullAlpha * 0.22;
        this.drawVisualEdge(source, target, edgeId, mode);
        this.ctx.globalAlpha = fullAlpha;
        this.ctx.setLineDash([2 / this.viewport.scale, 6 / this.viewport.scale]);
        this.drawVisualEdge(source, drawTarget, edgeId, mode);
        this.drawSketchStars(source, target, color, progress);
        break;
      case "radar-fan": {
        this.ctx.globalAlpha = fullAlpha * 0.34;
        this.drawVisualEdge(source, target, edgeId, mode);
        this.ctx.globalAlpha = fullAlpha;
        this.drawVisualEdge(source, drawTarget, edgeId, mode);
        const radius = Math.max(7, 12 / this.viewport.scale);
        this.ctx.beginPath();
        this.ctx.arc(drawTarget.x, drawTarget.y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.globalAlpha = fullAlpha * 0.18;
        this.ctx.beginPath();
        this.ctx.moveTo(drawTarget.x, drawTarget.y);
        this.ctx.arc(drawTarget.x, drawTarget.y, radius * 2.1, this.time * 2.2, this.time * 2.2 + 0.7);
        this.ctx.closePath();
        this.ctx.fillStyle = color;
        this.ctx.fill();
        break;
      }
      case "trace":
      default:
        this.drawVisualEdge(source, drawTarget, edgeId, mode);
        if (progress < 0.98) {
          this.drawPulseShape(drawTarget.x, drawTarget.y, color, 0.65, tipSize, source, target);
        }
        break;
    }

    this.ctx.restore();
    this.ctx.globalAlpha = fullAlpha;
  }

  private drawSimpleLine(from: { x: number; y: number }, to: { x: number; y: number }): void {
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }

  private drawLightningLine(source: GraphNode, target: { x: number; y: number }, edgeId: string, progress: number): void {
    const normal = this.edgeNormal(source, { ...source, ...target });
    const segments = 6;
    this.ctx.beginPath();
    for (let index = 0; index <= segments; index += 1) {
      const t = index / segments;
      const point = this.pointOnEdge(source, { ...source, ...target }, t);
      const jitter = index === 0 || index === segments ? 0 : (Math.sin(this.edgePhase(edgeId) * 60 + index * 2.7 + this.time * 12) * 7 * progress) / this.viewport.scale;
      const x = point.x + normal.x * jitter;
      const y = point.y + normal.y * jitter;
      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();
  }

  private drawMovingDots(source: GraphNode, target: GraphNode, color: string, count: number, shape: "circle" | "square", progress: number): void {
    const normal = this.edgeNormal(source, target);
    const baseAlpha = this.ctx.globalAlpha;
    this.ctx.fillStyle = color;
    for (let index = 0; index < count; index += 1) {
      const t = (this.time * (0.2 + this.config.motion.drawingLineSpeed * 1.7) + index / count + this.edgePhase(`${source.id}-${target.id}-${index}`)) % 1;
      if (t > Math.max(0.08, progress)) {
        continue;
      }
      const point = this.pointOnEdge(source, target, t);
      const offset = ((index % 3) - 1) * 2.5 / this.viewport.scale;
      const size = Math.max(1.6, 3.2 / this.viewport.scale);
      this.ctx.globalAlpha = baseAlpha * 0.72;
      if (shape === "square") {
        this.ctx.fillRect(point.x + normal.x * offset - size / 2, point.y + normal.y * offset - size / 2, size, size);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(point.x + normal.x * offset, point.y + normal.y * offset, size * 0.55, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  private drawSketchStars(source: GraphNode, target: GraphNode, color: string, progress: number): void {
    const baseAlpha = this.ctx.globalAlpha;
    this.ctx.fillStyle = color;
    for (let index = 0; index < 5; index += 1) {
      const t = (index + 1) / 6;
      if (t > progress) {
        continue;
      }
      const point = this.pointOnEdge(source, target, t);
      const size = Math.max(1.2, (1.8 + index * 0.18) / this.viewport.scale);
      this.ctx.globalAlpha = baseAlpha * 0.78;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawVisualNode(node: GraphNode, radius: number, shape: VisualNodeShape, accent: string): void {
    this.ctx.save();
    this.ctx.translate(node.x, node.y);
    switch (shape) {
      case "ring":
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = accent;
        this.ctx.globalAlpha *= 0.78;
        this.ctx.lineWidth = Math.max(1, 1.5 / this.viewport.scale);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 1.75, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
      case "square":
        this.ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
        break;
      case "diamond":
        this.ctx.rotate(Math.PI / 4);
        this.ctx.fillRect(-radius * 0.86, -radius * 0.86, radius * 1.72, radius * 1.72);
        break;
      case "hex":
        this.drawPolygon(6, radius);
        this.ctx.fill();
        break;
      case "star":
        this.drawStar(radius * 0.8);
        break;
      case "packet":
        this.ctx.fillRect(-radius * 1.25, -radius * 0.58, radius * 2.5, radius * 1.16);
        this.ctx.globalAlpha *= 0.42;
        this.ctx.fillStyle = accent;
        this.ctx.fillRect(-radius * 0.95, -radius * 1.15, radius * 1.9, radius * 0.28);
        break;
      case "bar":
        this.ctx.fillRect(-radius * 0.55, -radius * 1.25, radius * 1.1, radius * 2.5);
        break;
      case "stone":
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, radius * 1.18, radius * 0.82, Math.sin(this.edgePhase(node.id) * 6) * 0.7, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case "shard":
        this.ctx.beginPath();
        this.ctx.moveTo(0, -radius * 1.45);
        this.ctx.lineTo(radius * 0.92, -radius * 0.18);
        this.ctx.lineTo(radius * 0.28, radius * 1.28);
        this.ctx.lineTo(-radius * 0.86, radius * 0.42);
        this.ctx.closePath();
        this.ctx.fill();
        break;
      case "circle":
      default:
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fill();
        break;
    }
    this.ctx.restore();
  }

  private drawPolygon(sides: number, radius: number): void {
    this.ctx.beginPath();
    for (let index = 0; index < sides; index += 1) {
      const angle = -Math.PI / 2 + index * ((Math.PI * 2) / sides);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
  }

  private drawClickEffect(effect: ClickEffect, t: number): void {
    if (effect.style === "none") {
      return;
    }

    const alpha = 1 - t;
    const size = (12 + t * 54) / this.viewport.scale;
    this.ctx.save();
    this.ctx.translate(effect.x, effect.y);
    this.ctx.strokeStyle = effect.color;
    this.ctx.fillStyle = effect.color;
    this.ctx.lineWidth = Math.max(1, 1.6 / this.viewport.scale);

    switch (effect.style) {
      case "double-ripple":
        this.drawClickRing(size * 0.62, alpha * 0.7);
        this.drawClickRing(size * 1.05, alpha * 0.45);
        break;
      case "spark":
        this.drawClickSparks(8, size * 0.9, alpha, false);
        break;
      case "starburst":
        this.drawClickSparks(12, size * 1.08, alpha, true);
        break;
      case "halo": {
        const glow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        glow.addColorStop(0, this.withAlpha(effect.color, alpha * 0.28));
        glow.addColorStop(1, "transparent");
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      }
      case "pulse-ring":
        this.ctx.globalAlpha = alpha;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.globalAlpha = alpha * 0.3;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case "scanner":
        this.ctx.rotate(t * Math.PI * 2);
        this.ctx.globalAlpha = alpha * 0.65;
        this.ctx.fillRect(-size * 0.05, -size * 0.92, size * 0.1, size * 1.84);
        this.ctx.globalAlpha = alpha * 0.16;
        this.ctx.fillRect(-size * 0.42, -size * 0.62, size * 0.84, size * 1.24);
        break;
      case "diamond-pop":
        this.ctx.rotate(Math.PI / 4 + t * 0.8);
        this.ctx.globalAlpha = alpha * 0.8;
        this.ctx.strokeRect(-size * 0.42, -size * 0.42, size * 0.84, size * 0.84);
        break;
      case "orbit-dots":
        for (let index = 0; index < 6; index += 1) {
          const angle = t * Math.PI * 2 + index * (Math.PI / 3);
          this.ctx.globalAlpha = alpha * 0.75;
          this.ctx.beginPath();
          this.ctx.arc(Math.cos(angle) * size * 0.62, Math.sin(angle) * size * 0.62, Math.max(1.4, 2.2 / this.viewport.scale), 0, Math.PI * 2);
          this.ctx.fill();
        }
        break;
      case "shockwave":
        this.ctx.globalAlpha = alpha * 0.7;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 1.15, 0, Math.PI * 2);
        this.ctx.stroke();
        this.drawClickSparks(10, size * 0.95, alpha * 0.55, false);
        break;
      case "comet-bloom":
        this.ctx.globalAlpha = alpha * 0.72;
        this.drawStar(size * 0.28);
        this.ctx.rotate(-0.7);
        this.ctx.globalAlpha = alpha * 0.18;
        this.ctx.fillRect(-size * 0.95, -size * 0.08, size * 1.6, size * 0.16);
        break;
      case "ripple":
      default:
        this.drawClickRing(size * 0.82, alpha * 0.65);
        break;
    }

    this.ctx.restore();
  }

  private drawClickRing(radius: number, alpha: number): void {
    this.ctx.globalAlpha = alpha;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private drawClickSparks(count: number, radius: number, alpha: number, centerStar: boolean): void {
    if (centerStar) {
      this.ctx.globalAlpha = alpha * 0.5;
      this.drawStar(radius * 0.18);
    }
    for (let index = 0; index < count; index += 1) {
      const angle = index * ((Math.PI * 2) / count);
      const inner = radius * 0.24;
      const outer = radius;
      this.ctx.globalAlpha = alpha * (0.45 + (index % 3) * 0.14);
      this.ctx.beginPath();
      this.ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      this.ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      this.ctx.stroke();
    }
  }

  private drawLabel(node: GraphNode, color: string, selected: boolean): void {
    const size = 9 + this.config.display.labelSize * 8 + (selected ? 2 : 0);
    this.ctx.font = `${size}px var(--font-interface), sans-serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "top";
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = selected ? 1 : 0.72;
    this.ctx.fillText(node.title, node.x, node.y + this.nodeRadius(node) + 5, 180);
    this.ctx.globalAlpha = 1;
  }

  private drawPathAnimation(source: GraphNode, target: GraphNode, color: string, activeJourneyEdge: boolean): void {
    switch (this.config.motion.pathAnimation) {
      case "comet":
        this.drawComet(source, target, color);
        break;
      case "bidirectional":
        this.drawPulse(source, target, color, 0);
        this.drawPulse(target, source, color, 0.5);
        break;
      case "wave":
        this.drawWave(source, target, color);
        break;
      case "sparkle-train":
        this.drawSparkleTrain(source, target, color);
        break;
      case "traffic-flow":
        this.drawTrafficFlow(source, target, color);
        break;
      case "data-rain":
        this.drawDataRain(source, target, color);
        break;
      case "signal-burst":
        this.drawSignalBurst(source, target, color, activeJourneyEdge);
        break;
      case "single-pulse":
      default:
        this.drawPulse(source, target, color, 0);
        break;
    }
  }

  private drawPulse(source: GraphNode, target: GraphNode, color: string, offset: number): void {
    const t = (this.time * (0.45 + this.config.motion.colorSpeed * 2.2) + offset) % 1;
    const point = this.pointOnEdge(source, target, t);
    this.drawPulseShape(point.x, point.y, color, 1, Math.max(2.5, 4 / this.viewport.scale), source, target);
    this.drawTrail(source, target, color, Math.max(0, t - 0.12), t, 0.22, 2);
    this.ctx.globalAlpha = 1;
  }

  private drawComet(source: GraphNode, target: GraphNode, color: string): void {
    const t = (this.time * (0.45 + this.config.motion.colorSpeed * 2.2)) % 1;
    const point = this.pointOnEdge(source, target, t);
    for (let tail = 0; tail < 7; tail += 1) {
      const tailT = Math.max(0, t - tail * 0.035);
      const tailPoint = this.pointOnEdge(source, target, tailT);
      this.drawPulseShape(tailPoint.x, tailPoint.y, color, Math.max(0, 0.45 - tail * 0.055), Math.max(1.2, (5 - tail * 0.45) / this.viewport.scale), source, target);
    }
    this.drawPulseShape(point.x, point.y, color, 1, Math.max(3.5, 6 / this.viewport.scale), source, target);
    this.ctx.globalAlpha = 1;
  }

  private drawWave(source: GraphNode, target: GraphNode, color: string): void {
    const segments = 18;
    for (let index = 0; index < segments; index += 1) {
      const t = index / segments;
      const phase = Math.sin((t * Math.PI * 2) - this.time * (3 + this.config.motion.colorSpeed * 7));
      if (phase <= 0.15) {
        continue;
      }
      const point = this.pointOnEdge(source, target, t);
      this.drawPulseShape(point.x, point.y, color, phase * 0.48, Math.max(1.2, (1.6 + phase * 3.2) / this.viewport.scale), source, target);
    }
    this.ctx.globalAlpha = 1;
  }

  private drawSparkleTrain(source: GraphNode, target: GraphNode, color: string): void {
    const count = Math.max(3, Math.min(16, Math.round(this.config.motion.pulseAmount / 2)));
    for (let index = 0; index < count; index += 1) {
      const t = (this.time * (0.22 + this.config.motion.colorSpeed * 1.5) + index / count) % 1;
      const point = this.pointOnEdge(source, target, t);
      const flicker = 0.35 + Math.abs(Math.sin(this.time * 12 + index * 2.1)) * 0.65;
      this.drawPulseShape(point.x, point.y, index % 3 === 0 ? "#ffffff" : color, 0.25 + flicker * 0.55, Math.max(1.1, (1.5 + flicker * 2.2) / this.viewport.scale), source, target);
    }
    this.ctx.globalAlpha = 1;
  }

  private drawTrafficFlow(source: GraphNode, target: GraphNode, color: string): void {
    const lanes = Math.max(2, Math.min(10, Math.round(this.config.motion.pulseAmount / 5)));
    for (let index = 0; index < lanes; index += 1) {
      const t = (this.time * (0.3 + this.config.motion.colorSpeed * 2.4) + index / lanes) % 1;
      const start = Math.max(0, t - 0.06);
      this.drawTrail(source, target, index % 2 === 0 ? color : "#ffffff", start, t, 0.42, 3);
    }
    this.ctx.globalAlpha = 1;
  }

  private drawDataRain(source: GraphNode, target: GraphNode, color: string): void {
    const drops = Math.max(4, Math.min(24, this.config.motion.pulseAmount));
    const normal = this.edgeNormal(source, target);
    for (let index = 0; index < drops; index += 1) {
      const t = (this.time * (0.18 + this.config.motion.colorSpeed * 1.4) + index * 0.071) % 1;
      const point = this.pointOnEdge(source, target, t);
      const offset = ((index % 5) - 2) * 3.5 / this.viewport.scale;
      const x = point.x + normal.x * offset;
      const y = point.y + normal.y * offset;
      this.drawPulseShape(x, y, index % 2 === 0 ? color : "#ffffff", 0.18 + (index % 4) * 0.12, Math.max(2, 4 / this.viewport.scale), source, target);
    }
    this.ctx.globalAlpha = 1;
  }

  private drawSignalBurst(source: GraphNode, target: GraphNode, color: string, activeJourneyEdge: boolean): void {
    const centerT = activeJourneyEdge ? 0.5 + Math.sin(this.time * 3) * 0.22 : (this.time * 0.6) % 1;
    const point = this.pointOnEdge(source, target, centerT);
    for (let ring = 0; ring < 4; ring += 1) {
      this.ctx.strokeStyle = color;
      this.ctx.globalAlpha = Math.max(0, 0.5 - ring * 0.1);
      this.ctx.lineWidth = Math.max(0.8, 1.5 / this.viewport.scale);
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, (ring * 7 + ((this.time * 16) % 7)) / this.viewport.scale, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.drawPulse(source, target, color, 0);
    this.ctx.globalAlpha = 1;
  }

  private drawTrail(source: GraphNode, target: GraphNode, color: string, fromT: number, toT: number, alpha: number, width: number): void {
    const from = this.pointOnEdge(source, target, fromT);
    const to = this.pointOnEdge(source, target, toT);
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = Math.max(1, width / this.viewport.scale);
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }

  private drawPulseShape(
    x: number,
    y: number,
    color: string,
    alpha: number,
    size: number,
    source: GraphNode,
    target: GraphNode
  ): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = Math.max(1, 1.4 / this.viewport.scale);

    switch (this.config.motion.pulseStyle) {
      case "ring":
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 1.3, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
      case "double-ring":
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.globalAlpha = alpha * 0.55;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 1.8, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
      case "diamond":
        this.rotateToEdge(source, target);
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size * 1.3);
        this.ctx.lineTo(size * 1.3, 0);
        this.ctx.lineTo(0, size * 1.3);
        this.ctx.lineTo(-size * 1.3, 0);
        this.ctx.closePath();
        this.ctx.fill();
        break;
      case "square-packet":
        this.rotateToEdge(source, target);
        this.ctx.fillRect(-size * 1.4, -size * 0.75, size * 2.8, size * 1.5);
        break;
      case "hollow-dot":
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 1.1, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.globalAlpha = alpha * 0.35;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case "glow-bloom": {
        const glow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size * 3.4);
        glow.addColorStop(0, this.withAlpha(color, Math.min(0.85, alpha)));
        glow.addColorStop(0.35, this.withAlpha(color, alpha * 0.34));
        glow.addColorStop(1, "transparent");
        this.ctx.fillStyle = glow;
        this.ctx.globalAlpha = 1;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 3.4, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      }
      case "star-spark":
        this.drawStar(size);
        break;
      case "scanner":
        this.rotateToEdge(source, target);
        this.ctx.fillRect(-size * 0.35, -size * 2.2, size * 0.7, size * 4.4);
        this.ctx.globalAlpha = alpha * 0.22;
        this.ctx.fillRect(-size * 1.5, -size * 1.2, size * 3, size * 2.4);
        break;
      case "car-lights":
        this.rotateToEdge(source, target);
        this.ctx.fillStyle = "#fef3c7";
        this.ctx.globalAlpha = alpha;
        this.ctx.beginPath();
        this.ctx.arc(size * 0.75, -size * 0.42, size * 0.38, 0, Math.PI * 2);
        this.ctx.arc(size * 0.75, size * 0.42, size * 0.38, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = "#ef4444";
        this.ctx.globalAlpha = alpha * 0.75;
        this.ctx.beginPath();
        this.ctx.arc(-size * 0.85, -size * 0.42, size * 0.3, 0, Math.PI * 2);
        this.ctx.arc(-size * 0.85, size * 0.42, size * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = alpha * 0.16;
        this.ctx.fillStyle = "#fef3c7";
        this.ctx.fillRect(size * 0.45, -size * 1.1, size * 2.2, size * 2.2);
        break;
      case "ripple":
        for (let ring = 0; ring < 3; ring += 1) {
          this.ctx.globalAlpha = alpha * (0.55 - ring * 0.14);
          this.ctx.beginPath();
          this.ctx.arc(0, 0, size * (0.8 + ring * 0.85 + (this.time % 1) * 0.5), 0, Math.PI * 2);
          this.ctx.stroke();
        }
        break;
      case "orb":
      default:
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size, 0, Math.PI * 2);
        this.ctx.fill();
        break;
    }

    this.ctx.restore();
  }

  private rotateToEdge(source: GraphNode, target: GraphNode): void {
    this.ctx.rotate(Math.atan2(target.y - source.y, target.x - source.x));
  }

  private drawStar(size: number): void {
    this.ctx.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const radius = point % 2 === 0 ? size * 1.55 : size * 0.55;
      const angle = -Math.PI / 2 + point * Math.PI / 5;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (point === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  private pointOnEdge(source: GraphNode, target: GraphNode, t: number): { x: number; y: number } {
    return {
      x: source.x + (target.x - source.x) * t,
      y: source.y + (target.y - source.y) * t
    };
  }

  private edgeNormal(source: GraphNode, target: GraphNode): { x: number; y: number } {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    return {
      x: -dy / length,
      y: dx / length
    };
  }

  private drawNebula(width: number, height: number, color: string): void {
    if (
      this.config.visual !== "deep-space" &&
      this.config.visual !== "neon" &&
      this.config.visual !== "constellation" &&
      this.config.visual !== "fog-of-knowledge" &&
      this.config.visual !== "neural-bloom"
    ) {
      return;
    }
    const gradientA = this.ctx.createRadialGradient(width * 0.25, height * 0.3, 0, width * 0.25, height * 0.3, Math.max(width, height) * 0.55);
    gradientA.addColorStop(0, this.withAlpha(color, 0.16));
    gradientA.addColorStop(1, "transparent");
    this.ctx.fillStyle = gradientA;
    this.ctx.fillRect(0, 0, width, height);

    const gradientB = this.ctx.createRadialGradient(width * 0.78, height * 0.68, 0, width * 0.78, height * 0.68, Math.max(width, height) * 0.46);
    gradientB.addColorStop(0, this.withAlpha("#f472b6", this.config.visual === "neon" ? 0.18 : 0.09));
    gradientB.addColorStop(1, "transparent");
    this.ctx.fillStyle = gradientB;
    this.ctx.fillRect(0, 0, width, height);
  }

  private drawStarField(width: number, height: number, color: string): void {
    const budget = this.performanceManager.budget(this.graph, this.config);
    const baseAmount = this.config.motion.particlesEnabled ? this.config.motion.particleAmount : Math.min(36, this.config.motion.particleAmount);
    const amount = Math.floor(baseAmount * budget.particleScale);
    const particleSpeed = 0.2 + this.config.motion.particleSpeed * 2.8;
    this.ctx.fillStyle = color;
    for (let index = 0; index < amount; index += 1) {
      const x = (Math.sin(index * 91.7) * 0.5 + 0.5) * width;
      const y = ((Math.cos(index * 37.3 + this.time * 0.04 * particleSpeed) * 0.5 + 0.5) * height + this.time * 18 * particleSpeed * (index % 3)) % height;
      this.ctx.globalAlpha = 0.08 + (index % 5) * 0.025;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 0.8 + (index % 3) * 0.45, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  private drawMatrixRain(width: number, height: number, color: string): void {
    const columns = Math.floor(width / 22);
    const particleSpeed = 0.25 + this.config.motion.particleSpeed * 2.5;
    this.ctx.font = "11px var(--font-monospace), monospace";
    this.ctx.textAlign = "center";
    for (let column = 0; column < columns; column += 1) {
      const x = column * 22 + 11;
      const streamOffset = (this.time * 80 * particleSpeed + column * 47) % (height + 120);
      for (let drop = 0; drop < 7; drop += 1) {
        const y = streamOffset - drop * 18;
        if (y < 0 || y > height) {
          continue;
        }
        this.ctx.globalAlpha = Math.max(0, 0.32 - drop * 0.04);
        this.ctx.fillStyle = drop === 0 ? "#dcfce7" : color;
        this.ctx.fillText(String((column + drop) % 2), x, y);
      }
    }
    this.ctx.globalAlpha = 1;
  }

  private drawStarMapOverlay(width: number, height: number, color: string): void {
    const drift = (this.time * (0.12 + this.config.motion.particleSpeed * 0.28)) % 64;
    this.ctx.save();
    this.ctx.lineWidth = 1;

    for (let x = -64 + drift; x < width + 64; x += 64) {
      this.ctx.globalAlpha = 0.035;
      this.ctx.strokeStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x + Math.sin(this.time * 0.08 + x * 0.01) * 18, height);
      this.ctx.stroke();
    }

    for (let y = -64 + drift * 0.6; y < height + 64; y += 64) {
      this.ctx.globalAlpha = 0.03;
      this.ctx.strokeStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y + Math.cos(this.time * 0.06 + y * 0.01) * 14);
      this.ctx.stroke();
    }

    const points = 9;
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    for (let index = 0; index < points; index += 1) {
      const x = (Math.sin(index * 2.31) * 0.5 + 0.5) * width;
      const y = (Math.cos(index * 1.77) * 0.5 + 0.5) * height;
      const nextX = (Math.sin((index + 1) * 2.31) * 0.5 + 0.5) * width;
      const nextY = (Math.cos((index + 1) * 1.77) * 0.5 + 0.5) * height;
      const twinkle = 0.35 + Math.sin(this.time * 1.7 + index) * 0.25;

      this.ctx.globalAlpha = 0.06;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(nextX, nextY);
      this.ctx.stroke();

      this.ctx.globalAlpha = 0.16 + twinkle * 0.12;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 1.1 + twinkle, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
    this.ctx.globalAlpha = 1;
  }

  private getLineDrawProgress(edgeId: string, activeJourneyEdge: boolean): number {
    if (!this.config.motion.drawingLinesEnabled) {
      return 1;
    }

    const speed = 0.15 + this.config.motion.drawingLineSpeed * 1.85;
    const phase = (this.time * speed + this.edgePhase(edgeId) + (activeJourneyEdge ? 0.25 : 0)) % 1.25;
    return Math.max(0.04, Math.min(1, phase / 0.95));
  }

  private edgePhase(edgeId: string): number {
    let hash = 0;
    for (let index = 0; index < edgeId.length; index += 1) {
      hash = Math.imul(31, hash) + edgeId.charCodeAt(index);
    }
    return ((hash >>> 0) % 1000) / 1000;
  }

  private followCamera(dt: number): void {
    if (this.config.camera === "static" || !this.selectedNode || this.pointer.dragging) {
      return;
    }
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const profile = this.cameraProfile();
    const leadX = this.selectedNode.vx * profile.lead;
    const leadY = this.selectedNode.vy * profile.lead;
    const orbitX = Math.cos(this.time * (0.45 + this.config.motion.cameraSpeed) * 2) * profile.orbit;
    const orbitY = Math.sin(this.time * (0.45 + this.config.motion.cameraSpeed) * 2) * profile.orbit * 0.72;
    const driftX = Math.sin(this.time * 0.37) * profile.drift;
    const driftY = Math.cos(this.time * 0.29) * profile.drift;
    const shakeX = (Math.sin(this.time * 31) + Math.sin(this.time * 17)) * profile.shake;
    const shakeY = (Math.cos(this.time * 29) - Math.sin(this.time * 13)) * profile.shake;
    const targetX = -(this.selectedNode.x + leadX) * this.viewport.scale + orbitX + driftX + shakeX;
    const targetY = -(this.selectedNode.y + leadY) * this.viewport.scale + orbitY + driftY + shakeY;
    const easing = Math.min(1, dt * profile.followStrength * (0.35 + this.config.motion.cameraSpeed));
    this.viewport.x += (targetX - this.viewport.x) * easing;
    this.viewport.y += (targetY - this.viewport.y) * easing;

    if (profile.zoomMode !== "none") {
      const baseScale = Math.min(width, height) / 520;
      const desiredScale = Math.max(0.12, Math.min(3.2, this.cameraZoomScale(baseScale, profile.zoomMode)));
      this.viewport.scale += (desiredScale - this.viewport.scale) * easing * 0.35;
    }
  }

  private cameraProfile(): CameraProfile {
    const base: CameraProfile = { followStrength: 1.8, zoomMode: "none", orbit: 0, drift: 0, shake: 0, lead: 0 };
    switch (this.config.camera) {
      case "static":
        return { ...base, followStrength: 0 };
      case "calm":
        return { ...base, followStrength: 1.2, drift: 6 };
      case "floating":
        return { ...base, followStrength: 1.8, drift: 14 };
      case "cinematic":
        return { ...base, followStrength: 2.5, zoomMode: "fit", drift: 18, lead: 0.4 };
      case "dynamic":
        return { ...base, followStrength: 3.4, zoomMode: "fit", orbit: 20, drift: 10, lead: 0.65 };
      case "fast":
        return { ...base, followStrength: 5, zoomMode: "close", lead: 0.8 };
      case "focus-lock":
        return { ...base, followStrength: 6.2, zoomMode: "close", lead: 0.15 };
      case "slow-drift":
        return { ...base, followStrength: 0.9, zoomMode: "wide", drift: 32 };
      case "wide-orbit":
        return { ...base, followStrength: 1.4, zoomMode: "wide", orbit: 56, drift: 10 };
      case "close-orbit":
        return { ...base, followStrength: 2.8, zoomMode: "close", orbit: 28, lead: 0.3 };
      case "breathing-zoom":
        return { ...base, followStrength: 1.9, zoomMode: "pulse", drift: 8 };
      case "presenter-pan":
        return { ...base, followStrength: 1.1, zoomMode: "fit", drift: 46 };
      case "scanline":
        return { ...base, followStrength: 2.2, zoomMode: "fit", drift: 26, lead: 0.35 };
      case "radar-orbit":
        return { ...base, followStrength: 2.1, zoomMode: "fit", orbit: 42, lead: 0.2 };
      case "city-cruise":
        return { ...base, followStrength: 1.6, zoomMode: "wide", drift: 38, lead: 0.5 };
      case "data-chase":
        return { ...base, followStrength: 4.2, zoomMode: "close", lead: 1.15 };
      case "cluster-hop":
        return { ...base, followStrength: 3.8, zoomMode: "fit", orbit: 12, lead: 0.25 };
      case "edge-glide":
        return { ...base, followStrength: 2.6, zoomMode: "fit", drift: 18, lead: 0.95 };
      case "constellation-tour":
        return { ...base, followStrength: 1.7, zoomMode: "wide", orbit: 34, drift: 18 };
      case "zen-still":
        return { ...base, followStrength: 0.8, zoomMode: "wide", drift: 4 };
      case "paper-follow":
        return { ...base, followStrength: 1.3, zoomMode: "fit", drift: 2 };
      case "matrix-rush":
        return { ...base, followStrength: 4.6, zoomMode: "close", shake: 3.2, lead: 1.1 };
      case "galaxy-dive":
        return { ...base, followStrength: 2.9, zoomMode: "pulse", orbit: 36, drift: 16, lead: 0.4 };
      case "micro-wander":
        return { ...base, followStrength: 1.1, zoomMode: "none", drift: 20 };
      case "overview-pulse":
        return { ...base, followStrength: 1.2, zoomMode: "pulse", orbit: 8 };
      case "second-screen-calm":
        return { ...base, followStrength: 1, zoomMode: "wide", drift: 12 };
      case "custom":
      default:
        return { ...base, followStrength: 2, zoomMode: "fit", drift: 10 };
    }
  }

  private cameraZoomScale(baseScale: number, mode: CameraProfile["zoomMode"]): number {
    switch (mode) {
      case "close":
        return baseScale * 1.45;
      case "wide":
        return baseScale * 0.62;
      case "pulse":
        return baseScale * (0.9 + Math.sin(this.time * 1.5) * 0.16);
      case "fit":
        return baseScale;
      case "none":
      default:
        return this.viewport.scale;
    }
  }

  private isJourneyEdge(source: string, target: string): boolean {
    for (let index = 0; index < this.journeyPath.length - 1; index += 1) {
      const a = this.journeyPath[index];
      const b = this.journeyPath[index + 1];
      if ((a === source && b === target) || (a === target && b === source)) {
        return index <= this.journeyIndex;
      }
    }
    return false;
  }

  private drawEmptyState(width: number, height: number): void {
    this.ctx.fillStyle = "#a1a1aa";
    this.ctx.font = "14px var(--font-interface), sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText("No notes match this graph scope.", width / 2, height / 2);
  }

  private focusFactor(node: GraphNode): number {
    if (this.config.visual !== "fog-of-knowledge" || !this.selectedNode) {
      return 1;
    }
    if (node.id === this.selectedNode.id || this.hoverNeighborIds.has(node.id)) {
      return 1;
    }
    const distance = Math.hypot(node.x - this.selectedNode.x, node.y - this.selectedNode.y);
    const fade = Math.max(0.18, 1 - distance / 720);
    return Math.min(1, fade);
  }

  private clusterBloomFactor(node: GraphNode): number {
    if (this.config.visual !== "neural-bloom" || !this.selectedNode) {
      return 1;
    }
    return node.clusterId === this.selectedNode.clusterId ? 1.9 : 0.72;
  }

  private dynamicNodeColor(node: GraphNode, index: number, recent: boolean): string | null {
    const ruleColor = this.ruleColorForNode(node);
    if (ruleColor) {
      return ruleColor;
    }

    switch (this.config.colors) {
      case "heatmap": {
        const heat = Math.min(1, node.connectionCount / 12);
        return `hsl(${205 - heat * 185}, 88%, ${58 + heat * 10}%)`;
      }
      case "age-gradient": {
        const ageDays = Math.max(0, (Date.now() - node.lastModified) / 86400000);
        const freshness = Math.max(0, 1 - ageDays / 365);
        return `hsl(${210 + freshness * 55}, ${42 + freshness * 40}%, ${36 + freshness * 34}%)`;
      }
      case "focus-fade":
        if (!this.selectedNode || this.selectedNode.id === node.id) {
          return recent ? "#ffffff" : "#bfdbfe";
        }
        return "#475569";
      case "signal-strength": {
        const strength = Math.min(1, node.connectionCount / 16);
        return `hsl(${190 - strength * 80}, 92%, ${42 + strength * 32}%)`;
      }
      case "night-vision":
        return recent ? "#dcfce7" : "#86efac";
      case "archive-dust": {
        const ageDays = Math.max(0, (Date.now() - node.lastModified) / 86400000);
        return ageDays > 180 ? "#fbbf24" : "#a8a29e";
      }
      case "constellation-white":
        return recent ? "#ffffff" : "#dbeafe";
      case "infrared": {
        const heat = Math.min(1, node.connectionCount / 14);
        return `hsl(${330 + heat * 60}, 88%, ${48 + heat * 18}%)`;
      }
      case "prism-flow":
        return `hsl(${(this.time * 80 + index * 31) % 360}, 86%, 64%)`;
      default:
        return null;
    }
  }

  private ruleColorForNode(node: GraphNode): string | null {
    if (!this.config.tools.enableColorRules) {
      return null;
    }

    const rules = this.config.tools.colorRulesText
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (rules.length === 0) {
      return null;
    }

    const path = node.path.toLowerCase();
    const tags = this.tagsForNode(node);
    for (const rule of rules) {
      const match = /^(tag|folder):([^=]+)=(#[0-9a-f]{6})$/i.exec(rule);
      if (!match) {
        continue;
      }
      const [, kind, rawNeedle, color] = match;
      const needle = rawNeedle.trim().replace(/^#/, "").toLowerCase();
      if (kind.toLowerCase() === "folder" && path.includes(needle)) {
        return color;
      }
      if (kind.toLowerCase() === "tag" && tags.some((tag) => tag === needle || tag.startsWith(`${needle}/`))) {
        return color;
      }
    }
    return null;
  }

  private tagsForNode(node: GraphNode): string[] {
    const cache = this.app.metadataCache.getFileCache(node.file);
    const tags = new Set<string>();
    cache?.tags?.forEach((tag) => tags.add(tag.tag.replace(/^#/, "").toLowerCase()));
    const frontmatterTags = cache?.frontmatter?.tags as unknown;
    if (typeof frontmatterTags === "string") {
      frontmatterTags
        .split(/[,;\s]+/)
        .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
        .filter(Boolean)
        .forEach((tag) => tags.add(tag));
    }
    if (Array.isArray(frontmatterTags)) {
      frontmatterTags.forEach((tag) => {
        if (typeof tag === "string") {
          tags.add(tag.replace(/^#/, "").toLowerCase());
        }
      });
    }
    return Array.from(tags);
  }

  private edgeColor(edge: { id: string; weight: number }, selected: boolean, activeJourneyEdge: boolean, base: string, active: string): string {
    if (selected || activeJourneyEdge) {
      return active;
    }
    switch (this.config.colors) {
      case "heatmap": {
        const heat = Math.min(1, edge.weight / 4);
        return `hsl(${205 - heat * 185}, 82%, ${48 + heat * 22}%)`;
      }
      case "signal-strength": {
        const strength = Math.min(1, edge.weight / 5);
        return `hsl(${190 - strength * 70}, 90%, ${38 + strength * 26}%)`;
      }
      case "prism-flow": {
        const phase = this.edgePhase(edge.id);
        return `hsl(${(this.time * 90 + phase * 360) % 360}, 86%, 62%)`;
      }
      case "cluster-neon": {
        const phase = this.edgePhase(edge.id);
        return `hsl(${(phase * 360 + this.time * 20) % 360}, 90%, 64%)`;
      }
      case "focus-fade":
        return this.selectedNode ? "#334155" : base;
      case "night-vision":
        return "#22c55e";
      case "archive-dust":
        return "#a16207";
      case "constellation-white":
        return "#bfdbfe";
      case "infrared":
        return "#f97316";
      default:
        return base;
    }
  }

  private edgeAlpha(edge: { weight: number }, selected: boolean, activeJourneyEdge: boolean): number {
    const base = activeJourneyEdge ? 0.92 : selected ? 0.78 : 0.22 + this.config.motion.visualIntensity * 0.16;
    if (this.config.colors === "focus-fade" && this.selectedNode && !selected && !activeJourneyEdge) {
      return 0.08;
    }
    if (this.config.colors === "signal-strength") {
      return Math.min(0.82, base + edge.weight * 0.08);
    }
    return base;
  }

  private edgeWidth(edge: { weight: number }): number {
    if (this.config.colors === "signal-strength") {
      return 0.75 + Math.min(1.4, edge.weight * 0.22);
    }
    return 0.9;
  }

  private visualProfile(): VisualProfile {
    const base: VisualProfile = {
      edgeMode: "line",
      nodeShape: "circle",
      edgeMultiplier: 1,
      nodeMultiplier: 1,
      glowMultiplier: 1,
      labelThreshold: 0.88
    };

    switch (this.config.visual) {
      case "minimal":
        return { ...base, edgeMultiplier: 0.7, nodeMultiplier: 0.86, glowMultiplier: 0, labelThreshold: 1.05 };
      case "clean":
        return { ...base, edgeMultiplier: 0.86, nodeMultiplier: 0.92, glowMultiplier: 0.35, labelThreshold: 0.98 };
      case "soft-glow":
        return { ...base, edgeMultiplier: 0.95, nodeMultiplier: 1.04, glowMultiplier: 1.45, labelThreshold: 0.92 };
      case "deep-space":
        return { ...base, edgeMode: "curve", edgeMultiplier: 1.1, nodeMultiplier: 1.04, glowMultiplier: 1.55, labelThreshold: 0.9 };
      case "neon":
        return { ...base, edgeMultiplier: 1.25, nodeMultiplier: 1.08, glowMultiplier: 1.8, labelThreshold: 0.92 };
      case "star-chart":
        return { ...base, edgeMode: "dash", nodeShape: "star", edgeMultiplier: 0.82, nodeMultiplier: 0.9, glowMultiplier: 1.1, labelThreshold: 0.8 };
      case "galaxy-spiral":
        return { ...base, edgeMode: "curve", nodeShape: "ring", edgeMultiplier: 1.18, nodeMultiplier: 1.04, glowMultiplier: 1.75, labelThreshold: 0.95 };
      case "matrix-grid":
        return { ...base, edgeMode: "orthogonal", nodeShape: "square", edgeMultiplier: 0.88, nodeMultiplier: 0.88, glowMultiplier: 1.2, labelThreshold: 1.04 };
      case "blueprint-lines":
        return { ...base, edgeMode: "dash", nodeShape: "ring", edgeMultiplier: 0.72, nodeMultiplier: 0.86, glowMultiplier: 0.2, labelThreshold: 0.78 };
      case "orbital-rings":
        return { ...base, edgeMode: "curve", nodeShape: "ring", edgeMultiplier: 0.95, nodeMultiplier: 1, glowMultiplier: 1.3, labelThreshold: 0.98 };
      case "city-network":
        return { ...base, edgeMode: "double", nodeShape: "bar", edgeMultiplier: 0.88, nodeMultiplier: 0.92, glowMultiplier: 1.15, labelThreshold: 1.02 };
      case "data-stream":
        return { ...base, edgeMode: "dash", nodeShape: "packet", edgeMultiplier: 1.05, nodeMultiplier: 0.9, glowMultiplier: 1.25, labelThreshold: 1 };
      case "heatmap-cloud":
        return { ...base, edgeMultiplier: 1.35, nodeMultiplier: 1.2, glowMultiplier: 1.55, labelThreshold: 1.02 };
      case "paper-map":
        return { ...base, edgeMode: "dash", nodeShape: "circle", edgeMultiplier: 0.62, nodeMultiplier: 0.82, glowMultiplier: 0, labelThreshold: 0.65 };
      case "library-index":
        return { ...base, edgeMode: "line", nodeShape: "square", edgeMultiplier: 0.7, nodeMultiplier: 0.8, glowMultiplier: 0.15, labelThreshold: 0.72 };
      case "zen-stones":
        return { ...base, edgeMultiplier: 0.58, nodeShape: "stone", nodeMultiplier: 1.05, glowMultiplier: 0.35, labelThreshold: 0.9 };
      case "crystal-lattice":
        return { ...base, edgeMode: "double", nodeShape: "shard", edgeMultiplier: 0.82, nodeMultiplier: 1.08, glowMultiplier: 1.65, labelThreshold: 0.92 };
      case "solar-orbits":
        return { ...base, edgeMode: "curve", nodeShape: "ring", edgeMultiplier: 0.86, nodeMultiplier: 1.14, glowMultiplier: 1.5, labelThreshold: 1.02 };
      case "terminal-blocks":
        return { ...base, edgeMode: "orthogonal", nodeShape: "packet", edgeMultiplier: 0.9, nodeMultiplier: 0.9, glowMultiplier: 1, labelThreshold: 1.08 };
      case "red-scanner":
        return { ...base, edgeMode: "dash", nodeShape: "diamond", edgeMultiplier: 1.18, nodeMultiplier: 1.04, glowMultiplier: 1.7, labelThreshold: 1 };
      case "ocean-bubbles":
        return { ...base, edgeMode: "curve", nodeShape: "ring", edgeMultiplier: 0.78, nodeMultiplier: 1.08, glowMultiplier: 1.25, labelThreshold: 0.95 };
      case "prism-shards":
        return { ...base, edgeMode: "double", nodeShape: "shard", edgeMultiplier: 1.06, nodeMultiplier: 1.06, glowMultiplier: 1.55, labelThreshold: 0.94 };
      case "radar-sweep":
        return { ...base, edgeMode: "dash", nodeShape: "ring", edgeMultiplier: 0.92, nodeMultiplier: 0.98, glowMultiplier: 1.25, labelThreshold: 0.96 };
      case "topographic":
        return { ...base, edgeMode: "curve", nodeShape: "stone", edgeMultiplier: 0.68, nodeMultiplier: 0.92, glowMultiplier: 0.18, labelThreshold: 0.76 };
      case "circuit-board":
        return { ...base, edgeMode: "orthogonal", nodeShape: "hex", edgeMultiplier: 0.76, nodeMultiplier: 0.86, glowMultiplier: 0.85, labelThreshold: 1.04 };
      case "fog-of-knowledge":
        return { ...base, edgeMode: "curve", nodeShape: "circle", edgeMultiplier: 0.62, nodeMultiplier: 0.96, glowMultiplier: 1.25, labelThreshold: 0.95 };
      case "ink-map":
        return { ...base, edgeMode: "curve", nodeShape: "circle", edgeMultiplier: 0.58, nodeMultiplier: 0.82, glowMultiplier: 0.18, labelThreshold: 0.68 };
      case "neural-bloom":
        return { ...base, edgeMode: "curve", nodeShape: "ring", edgeMultiplier: 1.08, nodeMultiplier: 1.02, glowMultiplier: 1.85, labelThreshold: 0.92 };
      case "satellite-view":
        return { ...base, edgeMode: "dash", nodeShape: "ring", edgeMultiplier: 0.9, nodeMultiplier: 0.92, glowMultiplier: 1.35, labelThreshold: 0.98 };
      case "glass-minimal":
        return { ...base, edgeMode: "line", nodeShape: "ring", edgeMultiplier: 0.55, nodeMultiplier: 0.82, glowMultiplier: 0.7, labelThreshold: 0.86 };
      case "academic-light":
        return { ...base, edgeMode: "dash", nodeShape: "circle", edgeMultiplier: 0.52, nodeMultiplier: 0.78, glowMultiplier: 0.12, labelThreshold: 0.58 };
      case "constellation":
      default:
        return base;
    }
  }

  private getPalette() {
    switch (this.config.visual) {
      case "ink-map":
        return {
          backgroundA: "#f8f5ec",
          backgroundB: "#ded3bd",
          node: "#1f2937",
          nodeRecent: "#334155",
          nodeActive: "#111827",
          nodeVisited: "#475569",
          edge: "#334155",
          edgeActive: "#0f172a",
          label: "#111827"
        };
      case "academic-light":
        return {
          backgroundA: "#fbfaf6",
          backgroundB: "#e8e1d2",
          node: "#334155",
          nodeRecent: "#0f766e",
          nodeActive: "#111827",
          nodeVisited: "#64748b",
          edge: "#64748b",
          edgeActive: "#1d4ed8",
          label: "#1f2937"
        };
      case "satellite-view":
        return {
          backgroundA: "#020617",
          backgroundB: "#0a1f2e",
          node: "#93c5fd",
          nodeRecent: "#67e8f9",
          nodeActive: "#f8fafc",
          nodeVisited: "#60a5fa",
          edge: "#38bdf8",
          edgeActive: "#facc15",
          label: "#e0f2fe"
        };
      case "glass-minimal":
        return {
          backgroundA: "#090b10",
          backgroundB: "#18202c",
          node: "#cbd5e1",
          nodeRecent: "#e2e8f0",
          nodeActive: "#ffffff",
          nodeVisited: "#94a3b8",
          edge: "#94a3b8",
          edgeActive: "#bae6fd",
          label: "#f8fafc"
        };
      case "fog-of-knowledge":
        return {
          backgroundA: "#070b12",
          backgroundB: "#1e293b",
          node: "#c4b5fd",
          nodeRecent: "#bfdbfe",
          nodeActive: "#ffffff",
          nodeVisited: "#a78bfa",
          edge: "#64748b",
          edgeActive: "#f8fafc",
          label: "#e5e7eb"
        };
      case "neural-bloom":
        return {
          backgroundA: "#070414",
          backgroundB: "#1e1b4b",
          node: "#a78bfa",
          nodeRecent: "#67e8f9",
          nodeActive: "#ffffff",
          nodeVisited: "#c084fc",
          edge: "#818cf8",
          edgeActive: "#f0abfc",
          label: "#faf5ff"
        };
      default:
        break;
    }

    switch (this.config.colors) {
      case "aqua-mint":
        return {
          backgroundA: "#061716",
          backgroundB: "#102f2d",
          node: "#71d7d1",
          nodeRecent: "#b7fff7",
          nodeActive: "#f0fffd",
          nodeVisited: "#4fb9b4",
          edge: "#2fbfba",
          edgeActive: "#71d7d1",
          label: "#d9fffb"
        };
      case "deep-ocean":
        return {
          backgroundA: "#071923",
          backgroundB: "#102f3d",
          node: "#67e8f9",
          nodeRecent: "#a7f3d0",
          nodeActive: "#f8fafc",
          nodeVisited: "#5eead4",
          edge: "#38bdf8",
          edgeActive: "#a7f3d0",
          label: "#dff9ff"
        };
      case "sunset":
        return {
          backgroundA: "#1f1020",
          backgroundB: "#3b1825",
          node: "#fb7185",
          nodeRecent: "#fbbf24",
          nodeActive: "#fff7ed",
          nodeVisited: "#fda4af",
          edge: "#f97316",
          edgeActive: "#facc15",
          label: "#fff1f2"
        };
      case "forest":
        return {
          backgroundA: "#07170e",
          backgroundB: "#14261a",
          node: "#86efac",
          nodeRecent: "#bef264",
          nodeActive: "#f7fee7",
          nodeVisited: "#bbf7d0",
          edge: "#4ade80",
          edgeActive: "#d9f99d",
          label: "#ecfccb"
        };
      case "monochrome":
        return {
          backgroundA: "#111113",
          backgroundB: "#1f1f23",
          node: "#d4d4d8",
          nodeRecent: "#ffffff",
          nodeActive: "#ffffff",
          nodeVisited: "#a1a1aa",
          edge: "#a1a1aa",
          edgeActive: "#fafafa",
          label: "#f4f4f5"
        };
      case "rainbow-flow":
        return {
          backgroundA: "#09111f",
          backgroundB: "#211124",
          node: "#8b5cf6",
          nodeRecent: "#06b6d4",
          nodeActive: "#ffffff",
          nodeVisited: "#c084fc",
          edge: "#a78bfa",
          edgeActive: "#22d3ee",
          label: "#f8fafc"
        };
      case "cluster-based":
        return {
          backgroundA: "#0b1020",
          backgroundB: "#171b2f",
          node: "#60a5fa",
          nodeRecent: "#f9a8d4",
          nodeActive: "#ffffff",
          nodeVisited: "#c4b5fd",
          edge: "#94a3b8",
          edgeActive: "#f0abfc",
          label: "#f8fafc"
        };
      case "pastel":
        return {
          backgroundA: "#202033",
          backgroundB: "#2d3148",
          node: "#fbcfe8",
          nodeRecent: "#bfdbfe",
          nodeActive: "#ffffff",
          nodeVisited: "#ddd6fe",
          edge: "#c4b5fd",
          edgeActive: "#f9a8d4",
          label: "#f8fafc"
        };
      case "glacier":
        return {
          backgroundA: "#06151f",
          backgroundB: "#123246",
          node: "#bae6fd",
          nodeRecent: "#ccfbf1",
          nodeActive: "#f8fafc",
          nodeVisited: "#7dd3fc",
          edge: "#38bdf8",
          edgeActive: "#99f6e4",
          label: "#e0f2fe"
        };
      case "ember":
        return {
          backgroundA: "#1f0b09",
          backgroundB: "#32130d",
          node: "#fb923c",
          nodeRecent: "#facc15",
          nodeActive: "#fff7ed",
          nodeVisited: "#fdba74",
          edge: "#f97316",
          edgeActive: "#fde68a",
          label: "#ffedd5"
        };
      case "cyberpunk":
        return {
          backgroundA: "#090014",
          backgroundB: "#14142f",
          node: "#22d3ee",
          nodeRecent: "#f0abfc",
          nodeActive: "#fef08a",
          nodeVisited: "#a78bfa",
          edge: "#e879f9",
          edgeActive: "#67e8f9",
          label: "#faf5ff"
        };
      case "rose-garden":
        return {
          backgroundA: "#1f1117",
          backgroundB: "#351823",
          node: "#fda4af",
          nodeRecent: "#fecdd3",
          nodeActive: "#fff1f2",
          nodeVisited: "#f9a8d4",
          edge: "#fb7185",
          edgeActive: "#fbcfe8",
          label: "#ffe4e6"
        };
      case "vaporwave":
        return {
          backgroundA: "#160d2f",
          backgroundB: "#2b1747",
          node: "#f0abfc",
          nodeRecent: "#67e8f9",
          nodeActive: "#ffffff",
          nodeVisited: "#c084fc",
          edge: "#a78bfa",
          edgeActive: "#22d3ee",
          label: "#f5d0fe"
        };
      case "solarized":
        return {
          backgroundA: "#002b36",
          backgroundB: "#073642",
          node: "#2aa198",
          nodeRecent: "#b58900",
          nodeActive: "#fdf6e3",
          nodeVisited: "#268bd2",
          edge: "#586e75",
          edgeActive: "#859900",
          label: "#eee8d5"
        };
      case "nord":
        return {
          backgroundA: "#2e3440",
          backgroundB: "#3b4252",
          node: "#88c0d0",
          nodeRecent: "#a3be8c",
          nodeActive: "#eceff4",
          nodeVisited: "#81a1c1",
          edge: "#5e81ac",
          edgeActive: "#b48ead",
          label: "#e5e9f0"
        };
      case "graphite":
        return {
          backgroundA: "#0f1115",
          backgroundB: "#20242c",
          node: "#cbd5e1",
          nodeRecent: "#94a3b8",
          nodeActive: "#f8fafc",
          nodeVisited: "#64748b",
          edge: "#475569",
          edgeActive: "#e2e8f0",
          label: "#e2e8f0"
        };
      case "high-contrast":
        return {
          backgroundA: "#000000",
          backgroundB: "#111111",
          node: "#ffffff",
          nodeRecent: "#00ffff",
          nodeActive: "#ffff00",
          nodeVisited: "#ff00ff",
          edge: "#ffffff",
          edgeActive: "#ffff00",
          label: "#ffffff"
        };
      case "candy":
        return {
          backgroundA: "#251021",
          backgroundB: "#20304a",
          node: "#f9a8d4",
          nodeRecent: "#93c5fd",
          nodeActive: "#ffffff",
          nodeVisited: "#fde68a",
          edge: "#c4b5fd",
          edgeActive: "#f0abfc",
          label: "#fff7fb"
        };
      case "midnight-gold":
        return {
          backgroundA: "#050816",
          backgroundB: "#191724",
          node: "#fbbf24",
          nodeRecent: "#fde68a",
          nodeActive: "#fffbeb",
          nodeVisited: "#f59e0b",
          edge: "#92400e",
          edgeActive: "#facc15",
          label: "#fef3c7"
        };
      case "violet-storm":
        return {
          backgroundA: "#10051f",
          backgroundB: "#252044",
          node: "#a78bfa",
          nodeRecent: "#f0abfc",
          nodeActive: "#ffffff",
          nodeVisited: "#818cf8",
          edge: "#7c3aed",
          edgeActive: "#e879f9",
          label: "#ede9fe"
        };
      case "mint":
        return {
          backgroundA: "#061a16",
          backgroundB: "#12342d",
          node: "#99f6e4",
          nodeRecent: "#bbf7d0",
          nodeActive: "#f0fdfa",
          nodeVisited: "#5eead4",
          edge: "#2dd4bf",
          edgeActive: "#a7f3d0",
          label: "#ccfbf1"
        };
      case "lava":
        return {
          backgroundA: "#170707",
          backgroundB: "#3b0a0a",
          node: "#ef4444",
          nodeRecent: "#fb923c",
          nodeActive: "#fff7ed",
          nodeVisited: "#f97316",
          edge: "#dc2626",
          edgeActive: "#facc15",
          label: "#fee2e2"
        };
      case "arctic":
        return {
          backgroundA: "#e8f4ff",
          backgroundB: "#cfe7f7",
          node: "#2563eb",
          nodeRecent: "#0891b2",
          nodeActive: "#0f172a",
          nodeVisited: "#60a5fa",
          edge: "#64748b",
          edgeActive: "#0284c7",
          label: "#0f172a"
        };
      case "meadow":
        return {
          backgroundA: "#102014",
          backgroundB: "#263b1f",
          node: "#bef264",
          nodeRecent: "#86efac",
          nodeActive: "#f7fee7",
          nodeVisited: "#4ade80",
          edge: "#65a30d",
          edgeActive: "#d9f99d",
          label: "#ecfccb"
        };
      case "ocean-sunset":
        return {
          backgroundA: "#07162c",
          backgroundB: "#3a1837",
          node: "#38bdf8",
          nodeRecent: "#fb7185",
          nodeActive: "#fff7ed",
          nodeVisited: "#fbbf24",
          edge: "#818cf8",
          edgeActive: "#f472b6",
          label: "#e0f2fe"
        };
      case "ink":
        return {
          backgroundA: "#f8fafc",
          backgroundB: "#e2e8f0",
          node: "#0f172a",
          nodeRecent: "#1d4ed8",
          nodeActive: "#7c2d12",
          nodeVisited: "#334155",
          edge: "#64748b",
          edgeActive: "#0f172a",
          label: "#0f172a"
        };
      case "pearl":
        return {
          backgroundA: "#fffaf0",
          backgroundB: "#edf7f6",
          node: "#0f766e",
          nodeRecent: "#be123c",
          nodeActive: "#111827",
          nodeVisited: "#7c3aed",
          edge: "#94a3b8",
          edgeActive: "#0f766e",
          label: "#111827"
        };
      case "city-nights":
        return {
          backgroundA: "#050816",
          backgroundB: "#111827",
          node: "#fde68a",
          nodeRecent: "#f97316",
          nodeActive: "#fefce8",
          nodeVisited: "#38bdf8",
          edge: "#334155",
          edgeActive: "#facc15",
          label: "#e5e7eb"
        };
      case "star-map":
        return {
          backgroundA: "#020617",
          backgroundB: "#10233f",
          node: "#dbeafe",
          nodeRecent: "#fde68a",
          nodeActive: "#ffffff",
          nodeVisited: "#93c5fd",
          edge: "#60a5fa",
          edgeActive: "#fbbf24",
          label: "#e0f2fe"
        };
      case "dark-mode":
        return {
          backgroundA: "#050507",
          backgroundB: "#111827",
          node: "#cbd5e1",
          nodeRecent: "#7dd3fc",
          nodeActive: "#ffffff",
          nodeVisited: "#94a3b8",
          edge: "#475569",
          edgeActive: "#38bdf8",
          label: "#e5e7eb"
        };
      case "zen-garden":
        return { backgroundA: "#07140d", backgroundB: "#1b2b1c", node: "#d9f99d", nodeRecent: "#fef3c7", nodeActive: "#fff7ed", nodeVisited: "#86efac", edge: "#4d7c0f", edgeActive: "#fef3c7", label: "#f7fee7" };
      case "blueprint":
        return { backgroundA: "#061529", backgroundB: "#0c4a6e", node: "#67e8f9", nodeRecent: "#e0f2fe", nodeActive: "#ffffff", nodeVisited: "#38bdf8", edge: "#0284c7", edgeActive: "#22d3ee", label: "#dff9ff" };
      case "solar-system":
        return { backgroundA: "#030712", backgroundB: "#1f1708", node: "#fbbf24", nodeRecent: "#fb923c", nodeActive: "#fff7ed", nodeVisited: "#60a5fa", edge: "#92400e", edgeActive: "#fde68a", label: "#fef3c7" };
      case "library-night":
        return { backgroundA: "#140f0a", backgroundB: "#172016", node: "#d6d3d1", nodeRecent: "#bef264", nodeActive: "#fafaf9", nodeVisited: "#a8a29e", edge: "#57534e", edgeActive: "#a3e635", label: "#f5f5f4" };
      case "crystal":
        return { backgroundA: "#071827", backgroundB: "#4c1d95", node: "#bae6fd", nodeRecent: "#ddd6fe", nodeActive: "#ffffff", nodeVisited: "#c4b5fd", edge: "#67e8f9", edgeActive: "#e9d5ff", label: "#f0f9ff" };
      case "terminal-amber":
        return { backgroundA: "#090602", backgroundB: "#2a1702", node: "#fbbf24", nodeRecent: "#fde68a", nodeActive: "#fff7ed", nodeVisited: "#d97706", edge: "#92400e", edgeActive: "#f59e0b", label: "#fed7aa" };
      case "red-alert":
        return { backgroundA: "#080202", backgroundB: "#450a0a", node: "#f87171", nodeRecent: "#fef2f2", nodeActive: "#ffffff", nodeVisited: "#dc2626", edge: "#7f1d1d", edgeActive: "#ef4444", label: "#fee2e2" };
      case "ocean-depths":
        return { backgroundA: "#020617", backgroundB: "#042f2e", node: "#5eead4", nodeRecent: "#7dd3fc", nodeActive: "#ecfeff", nodeVisited: "#0ea5e9", edge: "#0f766e", edgeActive: "#67e8f9", label: "#ccfbf1" };
      case "paper-minimal":
        return { backgroundA: "#fbf7ed", backgroundB: "#e7dcc4", node: "#1f2937", nodeRecent: "#7c2d12", nodeActive: "#000000", nodeVisited: "#57534e", edge: "#a8a29e", edgeActive: "#292524", label: "#1c1917" };
      case "galaxy-core":
        return { backgroundA: "#070018", backgroundB: "#3b0764", node: "#c4b5fd", nodeRecent: "#fde68a", nodeActive: "#ffffff", nodeVisited: "#60a5fa", edge: "#7c3aed", edgeActive: "#facc15", label: "#f5f3ff" };
      case "heatmap":
        return { backgroundA: "#07111f", backgroundB: "#1b1020", node: "#38bdf8", nodeRecent: "#facc15", nodeActive: "#ffffff", nodeVisited: "#fb923c", edge: "#2563eb", edgeActive: "#ef4444", label: "#f8fafc" };
      case "age-gradient":
        return { backgroundA: "#09111f", backgroundB: "#172554", node: "#64748b", nodeRecent: "#ffffff", nodeActive: "#f8fafc", nodeVisited: "#93c5fd", edge: "#475569", edgeActive: "#bfdbfe", label: "#dbeafe" };
      case "cluster-neon":
        return { backgroundA: "#050014", backgroundB: "#111827", node: "#22d3ee", nodeRecent: "#f0abfc", nodeActive: "#ffffff", nodeVisited: "#a78bfa", edge: "#8b5cf6", edgeActive: "#67e8f9", label: "#faf5ff" };
      case "focus-fade":
        return { backgroundA: "#050816", backgroundB: "#111827", node: "#64748b", nodeRecent: "#dbeafe", nodeActive: "#ffffff", nodeVisited: "#475569", edge: "#334155", edgeActive: "#f8fafc", label: "#f8fafc" };
      case "signal-strength":
        return { backgroundA: "#03111c", backgroundB: "#111827", node: "#38bdf8", nodeRecent: "#facc15", nodeActive: "#ffffff", nodeVisited: "#0ea5e9", edge: "#0369a1", edgeActive: "#fde68a", label: "#e0f2fe" };
      case "night-vision":
        return { backgroundA: "#020a06", backgroundB: "#06170e", node: "#86efac", nodeRecent: "#dcfce7", nodeActive: "#ffffff", nodeVisited: "#22c55e", edge: "#15803d", edgeActive: "#bbf7d0", label: "#dcfce7" };
      case "archive-dust":
        return { backgroundA: "#18120a", backgroundB: "#292016", node: "#a8a29e", nodeRecent: "#fef3c7", nodeActive: "#fff7ed", nodeVisited: "#fbbf24", edge: "#78716c", edgeActive: "#f59e0b", label: "#fafaf9" };
      case "prism-flow":
        return { backgroundA: "#080b18", backgroundB: "#24113f", node: "#22d3ee", nodeRecent: "#f0abfc", nodeActive: "#ffffff", nodeVisited: "#fde68a", edge: "#a78bfa", edgeActive: "#67e8f9", label: "#f8fafc" };
      case "constellation-white":
        return { backgroundA: "#020617", backgroundB: "#0f172a", node: "#dbeafe", nodeRecent: "#ffffff", nodeActive: "#ffffff", nodeVisited: "#93c5fd", edge: "#64748b", edgeActive: "#bfdbfe", label: "#eff6ff" };
      case "infrared":
        return { backgroundA: "#120312", backgroundB: "#2a0c20", node: "#f97316", nodeRecent: "#f43f5e", nodeActive: "#fff7ed", nodeVisited: "#c026d3", edge: "#be123c", edgeActive: "#fb923c", label: "#ffe4e6" };
      case "aurora":
      default:
        return {
          backgroundA: "#08111d",
          backgroundB: "#182133",
          node: "#8bffd2",
          nodeRecent: "#8ab4ff",
          nodeActive: "#f8fafc",
          nodeVisited: "#a7f3d0",
          edge: "#7dd3fc",
          edgeActive: "#c4b5fd",
          label: "#eef7ff"
        };
    }
  }

  private clusterColor(clusterId: number): string {
    const colors = ["#67e8f9", "#a7f3d0", "#c4b5fd", "#f9a8d4", "#fde68a", "#fca5a5", "#86efac", "#93c5fd", "#fdba74", "#d8b4fe"];
    return colors[Math.abs(clusterId) % colors.length];
  }

  private withAlpha(hex: string, alpha: number): string {
    const normalized = hex.replace("#", "");
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  private cssColor(variableName: string, fallback: string): string {
    return getComputedStyle(document.body).getPropertyValue(variableName).trim() || fallback;
  }

  private nodeRadius(node: GraphNode): number {
    return node.radius * (0.65 + this.config.display.nodeSize * 1.2);
  }

  private updateHover(node: GraphNode | null): void {
    if (this.hoverNode?.id === node?.id) {
      return;
    }
    this.hoverNode = node;
    this.hoverNeighborIds = new Set();
    if (!node) {
      return;
    }
    this.graph.edges.forEach((edge) => {
      if (edge.source === node.id) {
        this.hoverNeighborIds.add(edge.target);
      }
      if (edge.target === node.id) {
        this.hoverNeighborIds.add(edge.source);
      }
    });
  }

  private updateFps(now: number): void {
    this.fpsFrameCount += 1;
    if (now - this.fpsStartedAt < 500) {
      return;
    }
    this.fps = Math.round((this.fpsFrameCount * 1000) / (now - this.fpsStartedAt));
    this.fpsFrameCount = 0;
    this.fpsStartedAt = now;
  }

  private drawHud(width: number, height: number): void {
    const colors = this.getPalette();
    if (this.config.tools.showMiniMap) {
      this.drawMiniMap(width, height, colors);
    }
    if (this.config.display.showLegend) {
      this.drawLegend(width, height, colors);
    }
    if (this.config.display.showFps) {
      this.ctx.save();
      this.ctx.font = "11px var(--font-interface), sans-serif";
      this.ctx.textAlign = "right";
      this.ctx.textBaseline = "top";
      this.ctx.fillStyle = colors.label;
      this.ctx.globalAlpha = 0.72;
      this.ctx.fillText(`${this.fps || 0} FPS`, width - 16, 14);
      this.ctx.restore();
    }
  }

  private drawLegend(width: number, height: number, colors: ReturnType<ConstellaGraphRenderer["getPalette"]>): void {
    const entries = this.legendEntries(colors);
    if (entries.length === 0) {
      return;
    }

    const boxWidth = 178;
    const x = 14;
    const y = Math.max(14, height - 20 - entries.length * 18);
    this.ctx.save();
    this.ctx.fillStyle = this.withAlpha(colors.backgroundA, 0.72);
    this.ctx.strokeStyle = this.withAlpha(colors.edge, 0.22);
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, boxWidth, 10 + entries.length * 18, 8);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.font = "11px var(--font-interface), sans-serif";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "middle";
    entries.forEach((entry, index) => {
      const rowY = y + 13 + index * 18;
      this.ctx.fillStyle = entry.color;
      this.ctx.globalAlpha = 0.95;
      this.ctx.beginPath();
      this.ctx.arc(x + 13, rowY, 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = colors.label;
      this.ctx.globalAlpha = 0.78;
      this.ctx.fillText(entry.label, x + 24, rowY, boxWidth - 34);
    });
    this.ctx.restore();
  }

  private drawVisualBackdrop(width: number, height: number, colors: ReturnType<ConstellaGraphRenderer["getPalette"]>): void {
    switch (this.config.visual) {
      case "ink-map":
      case "academic-light":
        this.drawPaperGrid(width, height, colors.edge);
        break;
      case "satellite-view":
        this.drawSatelliteSweep(width, height, colors.edgeActive);
        break;
      case "glass-minimal":
        this.drawGlassWash(width, height, colors.edgeActive);
        break;
      case "fog-of-knowledge":
        this.drawKnowledgeFog(width, height, colors.backgroundA);
        break;
      default:
        break;
    }
  }

  private drawPaperGrid(width: number, height: number, color: string): void {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 46) {
      this.ctx.globalAlpha = 0.045;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x + Math.sin(x * 0.07) * 3, height);
      this.ctx.stroke();
    }
    for (let y = 0; y < height; y += 46) {
      this.ctx.globalAlpha = 0.04;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y + Math.cos(y * 0.07) * 3);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private drawSatelliteSweep(width: number, height: number, color: string): void {
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const radius = Math.max(width, height) * 0.42;
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    for (let ring = 1; ring <= 4; ring += 1) {
      this.ctx.globalAlpha = 0.05;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius * ring * 0.25, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 0.14;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY);
    this.ctx.lineTo(centerX + Math.cos(this.time * 0.7) * radius, centerY + Math.sin(this.time * 0.7) * radius);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawGlassWash(width: number, height: number, color: string): void {
    const gradient = this.ctx.createRadialGradient(width * 0.3, height * 0.2, 0, width * 0.3, height * 0.2, Math.max(width, height) * 0.7);
    gradient.addColorStop(0, this.withAlpha(color, 0.08));
    gradient.addColorStop(1, "transparent");
    this.ctx.save();
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.restore();
  }

  private drawKnowledgeFog(width: number, height: number, color: string): void {
    const gradient = this.ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.18, width / 2, height / 2, Math.max(width, height) * 0.72);
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(1, this.withAlpha(color, 0.38));
    this.ctx.save();
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.restore();
  }

  private drawMiniMap(width: number, height: number, colors: ReturnType<ConstellaGraphRenderer["getPalette"]>): void {
    if (this.graph.nodes.length === 0) {
      return;
    }

    const mapWidth = 158;
    const mapHeight = 112;
    const x = Math.max(14, width - mapWidth - 14);
    const y = height - mapHeight - 20;
    const bounds = this.graphBounds();
    const scale = Math.min((mapWidth - 20) / Math.max(1, bounds.width), (mapHeight - 20) / Math.max(1, bounds.height));
    const centerX = x + mapWidth / 2;
    const centerY = y + mapHeight / 2;
    const project = (node: { x: number; y: number }): { x: number; y: number } => ({
      x: centerX + (node.x - bounds.centerX) * scale,
      y: centerY + (node.y - bounds.centerY) * scale
    });

    this.ctx.save();
    this.ctx.fillStyle = this.withAlpha(colors.backgroundA, 0.72);
    this.ctx.strokeStyle = this.withAlpha(colors.edge, 0.24);
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, mapWidth, mapHeight, 8);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.globalAlpha = 0.18;
    this.ctx.strokeStyle = colors.edge;
    this.graph.edges.slice(0, 260).forEach((edge) => {
      const source = this.nodeById.get(edge.source);
      const target = this.nodeById.get(edge.target);
      if (!source || !target) {
        return;
      }
      const a = project(source);
      const b = project(target);
      this.ctx.beginPath();
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
      this.ctx.stroke();
    });

    this.graph.nodes.forEach((node) => {
      const point = project(node);
      this.ctx.globalAlpha = this.selectedNode?.id === node.id ? 1 : 0.62;
      this.ctx.fillStyle = this.selectedNode?.id === node.id ? colors.nodeActive : colors.node;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, this.selectedNode?.id === node.id ? 3 : 1.7, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.globalAlpha = 0.52;
    this.ctx.strokeStyle = colors.edgeActive;
    this.ctx.lineWidth = 1;
    const viewLeft = (-this.viewport.x - width / 2) / this.viewport.scale;
    const viewTop = (-this.viewport.y - height / 2) / this.viewport.scale;
    const viewRight = viewLeft + width / this.viewport.scale;
    const viewBottom = viewTop + height / this.viewport.scale;
    const viewA = project({ x: viewLeft, y: viewTop });
    const viewB = project({ x: viewRight, y: viewBottom });
    this.ctx.strokeRect(viewA.x, viewA.y, viewB.x - viewA.x, viewB.y - viewA.y);
    this.ctx.restore();
  }

  private graphBounds(): { centerX: number; centerY: number; width: number; height: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    this.graph.nodes.forEach((node) => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    });
    return {
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY)
    };
  }

  private legendEntries(colors: ReturnType<ConstellaGraphRenderer["getPalette"]>): Array<{ label: string; color: string }> {
    switch (this.config.colors) {
      case "heatmap":
        return [
          { label: "Cool: fewer links", color: "#38bdf8" },
          { label: "Warm: many links", color: "#ef4444" }
        ];
      case "age-gradient":
        return [
          { label: "Bright: recent notes", color: "#ffffff" },
          { label: "Muted: older notes", color: "#64748b" }
        ];
      case "cluster-neon":
      case "cluster-based":
        return [
          { label: "Color: cluster group", color: colors.node },
          { label: "Bright: selected path", color: colors.edgeActive }
        ];
      case "signal-strength":
        return [
          { label: "Thin: weak link", color: colors.edge },
          { label: "Bright: strong link", color: colors.edgeActive }
        ];
      case "focus-fade":
        return [
          { label: "Bright: focus area", color: colors.nodeActive },
          { label: "Dim: outside focus", color: "#475569" }
        ];
      default:
        return [
          { label: "Current note", color: colors.nodeActive },
          { label: "Recent note", color: colors.nodeRecent },
          { label: "Connection", color: colors.edge }
        ];
    }
  }

  private drawPathPreview(): void {
    const startId = this.config.interaction.pathPreviewStartId;
    const endId = this.selectedNode?.id;
    if (!startId || !endId || startId === endId) {
      return;
    }
    const path = this.findPath(startId, endId);
    if (path.length < 2) {
      return;
    }

    const colors = this.getPalette();
    this.ctx.save();
    this.ctx.strokeStyle = colors.edgeActive;
    this.ctx.lineCap = "round";
    this.ctx.lineWidth = (3.2 + this.config.display.edgeThickness * 2.4) / this.viewport.scale;
    this.ctx.globalAlpha = 0.88;
    for (let index = 0; index < path.length - 1; index += 1) {
      const source = this.nodeById.get(path[index]);
      const target = this.nodeById.get(path[index + 1]);
      if (!source || !target) {
        continue;
      }
      this.ctx.beginPath();
      this.ctx.moveTo(source.x, source.y);
      this.ctx.lineTo(target.x, target.y);
      this.ctx.stroke();
      this.drawPulse(source, target, colors.edgeActive, index / path.length);
    }
    this.ctx.restore();
  }

  private findPath(startId: string, endId: string): string[] {
    const queue = [startId];
    const previous = new Map<string, string | null>([[startId, null]]);
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        break;
      }
      if (current === endId) {
        break;
      }
      for (const edge of this.graph.edges) {
        const next = edge.source === current ? edge.target : edge.target === current ? edge.source : null;
        if (next && !previous.has(next)) {
          previous.set(next, current);
          queue.push(next);
        }
      }
    }
    if (!previous.has(endId)) {
      return [];
    }
    const path: string[] = [];
    let cursor: string | null = endId;
    while (cursor) {
      path.unshift(cursor);
      cursor = previous.get(cursor) ?? null;
    }
    return path;
  }

  private centerGraph(): void {
    if (this.graph.nodes.length === 0) {
      this.viewport = { x: 0, y: 0, scale: 1 };
      return;
    }

    const bounds = this.graph.nodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.x),
        maxX: Math.max(acc.maxX, node.x),
        minY: Math.min(acc.minY, node.y),
        maxY: Math.max(acc.maxY, node.y)
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const graphWidth = Math.max(1, bounds.maxX - bounds.minX);
    const graphHeight = Math.max(1, bounds.maxY - bounds.minY);
    this.viewport = {
      x: -((bounds.minX + bounds.maxX) / 2),
      y: -((bounds.minY + bounds.maxY) / 2),
      scale: Math.max(0.18, Math.min(1.8, Math.min(width / graphWidth, height / graphHeight) * 0.68))
    };
  }

  private resize(): void {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, this.containerEl.clientWidth);
    const height = Math.max(1, this.containerEl.clientHeight);
    this.canvas.width = Math.floor(width * ratio);
    this.canvas.height = Math.floor(height * ratio);
    this.canvas.setCssStyles({
      width: `${width}px`,
      height: `${height}px`
    });
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointer = { dragging: true, lastX: event.clientX, lastY: event.clientY, moved: false };
    this.canvas.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.pointer.dragging) {
      this.updateHover(this.nodeAt(event.clientX, event.clientY));
      return;
    }

    const dx = event.clientX - this.pointer.lastX;
    const dy = event.clientY - this.pointer.lastY;
    this.pointer.lastX = event.clientX;
    this.pointer.lastY = event.clientY;
    this.pointer.moved = this.pointer.moved || Math.abs(dx) + Math.abs(dy) > 3;
    this.viewport.x += dx;
    this.viewport.y += dy;
    this.updateHover(null);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.pointer.dragging) {
      return;
    }

    this.pointer.dragging = false;
    this.canvas.releasePointerCapture(event.pointerId);

    if (!this.pointer.moved) {
      const node = this.nodeAt(event.clientX, event.clientY);
      this.selectedNode = node;
      this.options.onNodeSelected(node);
      this.updateHover(node);
      if (node) {
        this.addClickEffect(node);
      }
    }
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const previousScale = this.viewport.scale;
    const nextScale = Math.max(0.08, Math.min(5, previousScale * (event.deltaY > 0 ? 0.9 : 1.1)));
    this.viewport.scale = nextScale;
  };

  private readonly onDoubleClick = (event: MouseEvent): void => {
    const node = this.nodeAt(event.clientX, event.clientY);
    if (node) {
      this.addClickEffect(node);
      this.options.onNodeOpened(node);
    }
  };

  private addClickEffect(node: GraphNode): void {
    const colors = this.getPalette();
    this.clickEffects.push({
      id: this.nextClickEffectId,
      x: node.x,
      y: node.y,
      startedAt: performance.now(),
      color: colors.edgeActive,
      style: this.config.motion.clickAnimation
    });
    this.nextClickEffectId += 1;
    if (this.clickEffects.length > 24) {
      this.clickEffects.shift();
    }
  }

  private nodeAt(clientX: number, clientY: number): GraphNode | null {
    const rect = this.canvas.getBoundingClientRect();
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const x = (clientX - rect.left - width / 2 - this.viewport.x) / this.viewport.scale;
    const y = (clientY - rect.top - height / 2 - this.viewport.y) / this.viewport.scale;

    for (let index = this.graph.nodes.length - 1; index >= 0; index -= 1) {
      const node = this.graph.nodes[index];
      const radius = Math.max(this.nodeRadius(node) + 5, 10 / this.viewport.scale);
      if (Math.hypot(node.x - x, node.y - y) <= radius) {
        return node;
      }
    }

    return null;
  }
}
