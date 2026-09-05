import type { App } from "obsidian";
import type { ActiveConfiguration, GraphData, GraphNode, Viewport } from "../core/types";
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
  private journeyPath: string[] = [];
  private journeyIndex = 0;
  private pointer: PointerState = { dragging: false, lastX: 0, lastY: 0, moved: false };
  private lastFrame = performance.now();
  private time = 0;

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
    this.time += dt * this.config.motion.animationSpeed;
    this.step(dt);
    this.followCamera(dt);
    this.draw();
    this.animationFrame = window.requestAnimationFrame(this.render);
  };

  private step(dt: number): void {
    if (!this.config.motion.nodeMovementEnabled || this.graph.nodes.length === 0) {
      return;
    }

    const strength = (4 + this.config.motion.nodeMovementStrength * 42) * this.config.motion.visualIntensity;
    const speed = 0.25 + this.config.motion.nodeMovementSpeed * 3.5 + this.config.motion.animationSpeed;
    this.graph.nodes.forEach((node, index) => {
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
    this.drawNodes();
    this.ctx.restore();

    if (this.graph.nodes.length === 0) {
      this.drawEmptyState(width, height);
    }
  }

  private drawBackground(width: number, height: number): void {
    const colors = this.getPalette();
    const background = this.getBackground(colors.backgroundA, colors.backgroundB);

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

    if (this.config.motion.backgroundEffectsEnabled && this.config.visual !== "minimal") {
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
      default:
        return { a: paletteA, b: paletteB, gradient: true, animated: false, stars: true, nebula: true, matrix: false, starMap: false, transparent: false };
    }
  }

  private drawEdges(): void {
    const colors = this.getPalette();
    this.ctx.lineCap = "round";

    for (const edge of this.graph.edges) {
      const source = this.nodeById.get(edge.source);
      const target = this.nodeById.get(edge.target);
      if (!source || !target) {
        continue;
      }

      const selected = this.selectedNode?.id === source.id || this.selectedNode?.id === target.id;
      const activeJourneyEdge = this.isJourneyEdge(source.id, target.id);
      const lineProgress = this.getLineDrawProgress(edge.id, activeJourneyEdge);
      const drawTarget = this.pointOnEdge(source, target, lineProgress);
      this.ctx.strokeStyle = selected ? colors.edgeActive : colors.edge;
      this.ctx.globalAlpha = (activeJourneyEdge ? 0.92 : selected ? 0.78 : 0.22 + this.config.motion.visualIntensity * 0.16) * Math.max(0.24, lineProgress);
      this.ctx.lineWidth = activeJourneyEdge ? 2.4 / this.viewport.scale : selected ? 1.8 / this.viewport.scale : 0.9 / this.viewport.scale;
      this.ctx.beginPath();
      this.ctx.moveTo(source.x, source.y);
      this.ctx.lineTo(drawTarget.x, drawTarget.y);
      this.ctx.stroke();

      if (this.config.motion.drawingLinesEnabled && lineProgress < 0.98) {
        this.drawPulseShape(drawTarget.x, drawTarget.y, selected || activeJourneyEdge ? colors.edgeActive : colors.edge, 0.65, Math.max(1.7, 3 / this.viewport.scale), source, target);
      }

      if (this.config.motion.connectionPulsesEnabled && lineProgress > 0.35 && (activeJourneyEdge || Math.random() < 0.002 * this.config.motion.pulseAmount)) {
        this.drawPathAnimation(source, target, colors.edgeActive, activeJourneyEdge);
      }
    }

    this.ctx.globalAlpha = 1;
  }

  private drawNodes(): void {
    const colors = this.getPalette();
    const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 30;

    this.graph.nodes.forEach((node, index) => {
      const selected = this.selectedNode?.id === node.id;
      const currentJourney = this.journeyPath[this.journeyIndex] === node.id;
      const visitedJourney = this.journeyPath.includes(node.id);
      const recent = node.lastModified > recentCutoff;
      const hueShift = this.config.colors === "rainbow-flow" ? (this.time * 90 + index * 19) % 360 : null;
      const clusterColor = this.config.colors === "cluster-based" ? this.clusterColor(node.clusterId) : null;
      const fill = clusterColor ?? (hueShift === null ? (recent ? colors.nodeRecent : colors.node) : `hsl(${hueShift}, 86%, 64%)`);
      const glowRadius = node.radius * (currentJourney ? 5.8 : selected ? 4.4 : 2.4) * this.config.motion.visualIntensity;

      if (this.config.motion.glowEnabled && this.config.visual !== "minimal" && glowRadius > 0) {
        const glow = this.ctx.createRadialGradient(node.x, node.y, node.radius, node.x, node.y, glowRadius);
        glow.addColorStop(0, currentJourney || selected ? colors.nodeActive : fill);
        glow.addColorStop(1, "transparent");
        this.ctx.fillStyle = glow;
        this.ctx.globalAlpha = selected ? 0.58 : 0.28;
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.globalAlpha = 1;
      this.ctx.fillStyle = currentJourney || selected ? colors.nodeActive : visitedJourney ? colors.nodeVisited : fill;
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, currentJourney ? node.radius + 3 : selected ? node.radius + 2 : node.radius, 0, Math.PI * 2);
      this.ctx.fill();

      if (selected || this.viewport.scale > 0.88) {
        this.drawLabel(node, colors.label, selected);
      }
    });
  }

  private drawLabel(node: GraphNode, color: string, selected: boolean): void {
    this.ctx.font = `${selected ? 13 : 11}px var(--font-interface), sans-serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "top";
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = selected ? 1 : 0.72;
    this.ctx.fillText(node.title, node.x, node.y + node.radius + 5, 160);
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
    if (this.config.visual !== "deep-space" && this.config.visual !== "neon" && this.config.visual !== "constellation") {
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
    const targetX = -this.selectedNode.x * this.viewport.scale;
    const targetY = -this.selectedNode.y * this.viewport.scale;
    const strengthByCamera = {
      calm: 1.2,
      floating: 1.8,
      cinematic: 2.5,
      dynamic: 3.4,
      fast: 5,
      custom: 2,
      static: 0
    }[this.config.camera];
    const easing = Math.min(1, dt * strengthByCamera * (0.35 + this.config.motion.cameraSpeed));
    this.viewport.x += (targetX - this.viewport.x) * easing;
    this.viewport.y += (targetY - this.viewport.y) * easing;

    if (this.config.camera === "cinematic" || this.config.camera === "dynamic") {
      const desiredScale = Math.max(0.35, Math.min(2.4, Math.min(width, height) / 520));
      this.viewport.scale += (desiredScale - this.viewport.scale) * easing * 0.35;
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

  private getPalette() {
    switch (this.config.colors) {
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
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointer = { dragging: true, lastX: event.clientX, lastY: event.clientY, moved: false };
    this.canvas.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.pointer.dragging) {
      return;
    }

    const dx = event.clientX - this.pointer.lastX;
    const dy = event.clientY - this.pointer.lastY;
    this.pointer.lastX = event.clientX;
    this.pointer.lastY = event.clientY;
    this.pointer.moved = this.pointer.moved || Math.abs(dx) + Math.abs(dy) > 3;
    this.viewport.x += dx;
    this.viewport.y += dy;
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
      this.options.onNodeOpened(node);
    }
  };

  private nodeAt(clientX: number, clientY: number): GraphNode | null {
    const rect = this.canvas.getBoundingClientRect();
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const x = (clientX - rect.left - width / 2 - this.viewport.x) / this.viewport.scale;
    const y = (clientY - rect.top - height / 2 - this.viewport.y) / this.viewport.scale;

    for (let index = this.graph.nodes.length - 1; index >= 0; index -= 1) {
      const node = this.graph.nodes[index];
      const radius = Math.max(node.radius + 5, 10 / this.viewport.scale);
      if (Math.hypot(node.x - x, node.y - y) <= radius) {
        return node;
      }
    }

    return null;
  }
}
