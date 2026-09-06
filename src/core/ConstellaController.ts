import type { App, Plugin } from "obsidian";
import { EventBus } from "./EventBus";
import {
  cloneConfiguration,
  DEFAULT_CONFIGURATION,
  withCamera,
  withColors,
  withGraphScope,
  withMode,
  withVisual
} from "./ActiveConfiguration";
import { COLORS, DRAWING_LINE_STYLES, MODES, VISUALS } from "./types";
import type {
  ActiveConfiguration,
  BackgroundId,
  CameraId,
  ClickAnimationId,
  ColorsId,
  GraphData,
  GraphNode,
  GraphScope,
  JourneyState,
  ModeId,
  NodeMovementStyleId,
  Playlist,
  PlaybackState,
  StoredTemplate,
  VisualId
} from "./types";
import { GraphDataService } from "../graph/GraphDataService";
import type { ConstellaSettings } from "../settings/Settings";
import { PathEngine } from "../path/PathEngine";
import { DiscoveryEngine } from "../discovery/DiscoveryEngine";
import type { DiscoverySummary } from "../discovery/DiscoveryEngine";
import { TemplateManager } from "../templates/TemplateManager";
import { PlaylistManager } from "../playlists/PlaylistManager";

interface ConstellaEvents {
  configuration: ActiveConfiguration;
  graph: GraphData;
  playback: PlaybackState;
  selectedNode: GraphNode | null;
  journey: JourneyState | null;
  templates: StoredTemplate[];
  playlists: Playlist[];
}

export interface GraphHealthSummary {
  totalNotes: number;
  totalConnections: number;
  orphanNotes: GraphNode[];
  forgottenNotes: GraphNode[];
  hubNotes: GraphNode[];
  weakNotes: GraphNode[];
  clusterCount: number;
}

export class ConstellaController {
  readonly events = new EventBus<ConstellaEvents>();
  private readonly graphDataService: GraphDataService;
  private readonly pathEngine = new PathEngine();
  private readonly discoveryEngine = new DiscoveryEngine();
  private readonly templateManager = new TemplateManager();
  private readonly playlistManager = new PlaylistManager();
  private settings: ConstellaSettings;
  private graph: GraphData = { nodes: [], edges: [] };
  private playback: PlaybackState = "idle";
  private selectedNode: GraphNode | null = null;
  private journey: JourneyState | null = null;
  private journeyTimer: number | null = null;

  constructor(
    readonly app: App,
    private readonly plugin: Plugin,
    settings: ConstellaSettings,
    private readonly saveSettings: (settings: ConstellaSettings) => Promise<void>
  ) {
    this.settings = settings;
    this.graphDataService = new GraphDataService(app);
    this.settings.templates = this.templateManager.ensureBuiltIns(this.settings.templates, this.settings.configuration);
    this.settings.playlists = this.playlistManager.ensureBuiltIns(this.settings.playlists);
  }

  get configuration(): ActiveConfiguration {
    return this.settings.configuration;
  }

  get playbackState(): PlaybackState {
    return this.playback;
  }

  get currentGraph(): GraphData {
    return this.graph;
  }

  get currentNode(): GraphNode | null {
    return this.selectedNode;
  }

  get currentJourney(): JourneyState | null {
    return this.journey;
  }

  get templates(): StoredTemplate[] {
    return this.settings.templates;
  }

  get playlists(): Playlist[] {
    return this.settings.playlists;
  }

  get discoverySummary(): DiscoverySummary {
    return this.discoveryEngine.summarize(this.graph, this.configuration);
  }

  get graphHealthSummary(): GraphHealthSummary {
    const forgottenCutoff = Date.now() - this.configuration.discovery.forgottenDays * 86400000;
    const clusters = new Set(this.graph.nodes.map((node) => node.clusterId));
    const byConnections = [...this.graph.nodes].sort((a, b) => b.connectionCount - a.connectionCount);
    return {
      totalNotes: this.graph.nodes.length,
      totalConnections: this.graph.edges.length,
      orphanNotes: this.graph.nodes.filter((node) => node.connectionCount === 0).slice(0, 6),
      forgottenNotes: this.graph.nodes
        .filter((node) => node.lastModified <= forgottenCutoff)
        .sort((a, b) => a.lastModified - b.lastModified)
        .slice(0, 6),
      hubNotes: byConnections.slice(0, 6),
      weakNotes: this.graph.nodes
        .filter((node) => node.connectionCount > 0 && node.connectionCount <= this.configuration.discovery.minimumConnections)
        .sort((a, b) => a.connectionCount - b.connectionCount)
        .slice(0, 6),
      clusterCount: clusters.size
    };
  }

  get showFirstRun(): boolean {
    return this.settings.showFirstRun;
  }

  async dismissFirstRun(): Promise<void> {
    this.settings = {
      ...this.settings,
      showFirstRun: false
    };
    await this.persist();
  }

  refreshGraph(): void {
    this.graph = this.graphDataService.getGraph(this.configuration);
    this.events.emit("graph", this.graph);
  }

  async startJourneyFromPath(path: string): Promise<void> {
    const node = this.graph.nodes.find((item) => item.path === path) ?? null;
    this.selectNode(node);
    this.play();
  }

  async updateGraphScope(scope: GraphScope): Promise<void> {
    this.updateConfiguration(withGraphScope(this.configuration, scope));
    this.refreshGraph();
    await this.persist();
  }

  async updateLocalDepth(localDepth: number): Promise<void> {
    const clampedDepth = Math.max(1, Math.min(50, Math.round(localDepth)));
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      graph: {
        ...this.configuration.graph,
        localDepth: clampedDepth
      },
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    this.refreshGraph();
    await this.persist();
  }

  async updateGraphOption<TKey extends keyof ActiveConfiguration["graph"]>(
    key: TKey,
    value: ActiveConfiguration["graph"][TKey]
  ): Promise<void> {
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      graph: {
        ...this.configuration.graph,
        [key]: value
      },
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    this.refreshGraph();
    await this.persist();
  }

  async updateMode(mode: ModeId): Promise<void> {
    this.updateConfiguration(withMode(this.configuration, mode));
    await this.persist();
  }

  async updateVisual(visual: VisualId): Promise<void> {
    this.updateConfiguration(withVisual(this.configuration, visual));
    await this.persist();
  }

  async updateColors(colors: ColorsId): Promise<void> {
    this.updateConfiguration(withColors(this.configuration, colors));
    await this.persist();
  }

  async updateCamera(camera: CameraId): Promise<void> {
    this.updateConfiguration(withCamera(this.configuration, camera));
    await this.persist();
  }

  async updateMotion<TKey extends keyof ActiveConfiguration["motion"]>(
    key: TKey,
    value: ActiveConfiguration["motion"][TKey]
  ): Promise<void> {
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      motion: {
        ...this.configuration.motion,
        [key]: value
      },
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    await this.persist();
  }

  async updateBackground(style: BackgroundId): Promise<void> {
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      background: {
        ...this.configuration.background,
        style
      },
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    await this.persist();
  }

  async updateBackgroundOption<TKey extends keyof ActiveConfiguration["background"]>(
    key: TKey,
    value: ActiveConfiguration["background"][TKey]
  ): Promise<void> {
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      background: {
        ...this.configuration.background,
        [key]: value
      },
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    await this.persist();
  }

  async updateJourney<TKey extends keyof ActiveConfiguration["journey"]>(
    key: TKey,
    value: ActiveConfiguration["journey"][TKey]
  ): Promise<void> {
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      journey: {
        ...this.configuration.journey,
        [key]: value
      },
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    await this.persist();
  }

  async updateDiscovery<TKey extends keyof ActiveConfiguration["discovery"]>(
    key: TKey,
    value: ActiveConfiguration["discovery"][TKey]
  ): Promise<void> {
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      discovery: {
        ...this.configuration.discovery,
        [key]: value
      },
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    this.refreshGraph();
    await this.persist();
  }

  async updateDisplay<TKey extends keyof ActiveConfiguration["display"]>(
    key: TKey,
    value: ActiveConfiguration["display"][TKey]
  ): Promise<void> {
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      display: {
        ...this.configuration.display,
        [key]: value
      },
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    await this.persist();
  }

  async updateQuickUi<TKey extends keyof ActiveConfiguration["quickUi"]>(
    key: TKey,
    value: ActiveConfiguration["quickUi"][TKey]
  ): Promise<void> {
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      quickUi: {
        ...this.configuration.quickUi,
        [key]: value
      },
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    await this.persist();
  }

  async updateTools<TKey extends keyof ActiveConfiguration["tools"]>(
    key: TKey,
    value: ActiveConfiguration["tools"][TKey]
  ): Promise<void> {
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      tools: {
        ...this.configuration.tools,
        [key]: value
      },
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    await this.persist();
  }

  async updateInteraction<TKey extends keyof ActiveConfiguration["interaction"]>(
    key: TKey,
    value: ActiveConfiguration["interaction"][TKey]
  ): Promise<void> {
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      interaction: {
        ...this.configuration.interaction,
        [key]: value
      },
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    this.refreshGraph();
    await this.persist();
  }

  play(): void {
    this.playback = "playing";
    this.journey = this.pathEngine.createJourney(this.graph, this.configuration, this.selectedNode);
    this.emitJourneySelection();
    this.startJourneyTimer();
    this.events.emit("playback", this.playback);
  }

  pause(): void {
    this.playback = "paused";
    this.stopJourneyTimer();
    this.events.emit("playback", this.playback);
  }

  stop(): void {
    this.playback = "idle";
    this.journey = null;
    this.stopJourneyTimer();
    this.events.emit("journey", this.journey);
    this.events.emit("playback", this.playback);
  }

  selectNode(node: GraphNode | null): void {
    this.selectedNode = node;
    this.events.emit("selectedNode", node);
  }

  focusNodeByQuery(query: string): void {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      this.selectNode(null);
      return;
    }
    const node = this.graph.nodes.find((item) =>
      item.title.toLowerCase().includes(needle) || item.path.toLowerCase().includes(needle)
    ) ?? null;
    this.selectNode(node);
  }

  searchNodes(query: string, limit = 8): GraphNode[] {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return [];
    }
    return this.graph.nodes
      .filter((item) => item.title.toLowerCase().includes(needle) || item.path.toLowerCase().includes(needle))
      .sort((a, b) => {
        const aTitle = a.title.toLowerCase().startsWith(needle) ? 0 : 1;
        const bTitle = b.title.toLowerCase().startsWith(needle) ? 0 : 1;
        return aTitle - bTitle || b.connectionCount - a.connectionCount || a.title.localeCompare(b.title);
      })
      .slice(0, limit);
  }

  async togglePinnedSelected(): Promise<void> {
    if (!this.selectedNode) {
      return;
    }
    const pinned = new Set(this.configuration.interaction.pinnedNodeIds);
    if (pinned.has(this.selectedNode.id)) {
      pinned.delete(this.selectedNode.id);
    } else {
      pinned.add(this.selectedNode.id);
    }
    await this.updateInteraction("pinnedNodeIds", Array.from(pinned));
  }

  async hideSelectedNode(): Promise<void> {
    if (!this.selectedNode) {
      return;
    }
    await this.updateInteraction("hiddenNodeIds", Array.from(new Set([
      ...this.configuration.interaction.hiddenNodeIds,
      this.selectedNode.id
    ])));
  }

  async hideSelectedCluster(): Promise<void> {
    if (!this.selectedNode) {
      return;
    }
    await this.updateInteraction("hiddenClusterIds", Array.from(new Set([
      ...this.configuration.interaction.hiddenClusterIds,
      this.selectedNode.clusterId
    ])));
  }

  async expandFromSelected(): Promise<void> {
    await this.updateInteraction("expandFromNodeId", this.selectedNode?.id ?? null);
  }

  async markPathPreviewPoint(): Promise<void> {
    if (!this.selectedNode) {
      return;
    }
    const startId = this.configuration.interaction.pathPreviewStartId;
    await this.updateInteraction("pathPreviewStartId", startId && startId !== this.selectedNode.id ? null : this.selectedNode.id);
  }

  async clearInteractionState(): Promise<void> {
    this.selectNode(null);
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      interaction: cloneConfiguration(DEFAULT_CONFIGURATION).interaction,
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    this.refreshGraph();
    await this.persist();
  }

  async showAllNotes(): Promise<void> {
    this.selectNode(null);
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      graph: {
        ...this.configuration.graph,
        scope: "global",
        folderFilter: "",
        tagFilter: "",
        dateFilter: "all",
        minimumConnections: 0,
        includeFloatingNotes: true
      },
      discovery: {
        ...this.configuration.discovery,
        includeOrphans: true,
        excludeTemplates: false,
        excludeDailyNotes: false,
        excludeAttachments: true
      },
      interaction: cloneConfiguration(DEFAULT_CONFIGURATION).interaction,
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    this.refreshGraph();
    await this.persist();
  }

  async resetSection(section: "graph" | "motion" | "background" | "display" | "quickUi" | "journey" | "discovery" | "tools" | "interaction"): Promise<void> {
    const defaults = cloneConfiguration(DEFAULT_CONFIGURATION);
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      [section]: defaults[section],
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    if (section === "graph" || section === "discovery" || section === "interaction") {
      this.refreshGraph();
    }
    await this.persist();
  }

  async openNode(node: GraphNode): Promise<void> {
    await this.app.workspace.getLeaf(false).openFile(node.file);
  }

  async focusSuggestedNode(): Promise<void> {
    const node = this.pathEngine.selectStartNode(this.graph, this.configuration.mode, this.configuration);
    this.selectNode(node);
  }

  previousJourneyNode(): void {
    if (!this.journey) {
      return;
    }
    this.journey = {
      ...this.journey,
      currentIndex: Math.max(0, this.journey.currentIndex - 1),
      nextStepAt: Date.now() + this.configuration.journey.nodePauseSeconds * 1000
    };
    this.emitJourneySelection();
  }

  nextJourneyNode(): void {
    if (!this.journey) {
      this.journey = this.pathEngine.createJourney(this.graph, this.configuration, this.selectedNode);
      this.emitJourneySelection();
      return;
    }
    this.journey = {
      ...this.journey,
      currentIndex: Math.min(this.journey.path.length - 1, this.journey.currentIndex + 1),
      nextStepAt: Date.now() + this.configuration.journey.nodePauseSeconds * 1000
    };
    this.emitJourneySelection();
  }

  async startJourneyFromSelected(): Promise<void> {
    this.play();
  }

  async randomizeSafe(): Promise<void> {
    const modes: ModeId[] = MODES.map((mode) => mode.id);
    const visuals: VisualId[] = VISUALS.map((visual) => visual.id);
    const colors: ColorsId[] = COLORS.map((color) => color.id);
    const cameras: CameraId[] = [
      "static",
      "calm",
      "floating",
      "cinematic",
      "dynamic",
      "fast",
      "focus-lock",
      "slow-drift",
      "wide-orbit",
      "close-orbit",
      "breathing-zoom",
      "presenter-pan",
      "scanline",
      "radar-orbit",
      "city-cruise",
      "data-chase",
      "cluster-hop",
      "edge-glide",
      "constellation-tour",
      "zen-still",
      "paper-follow",
      "matrix-rush",
      "galaxy-dive",
      "micro-wander",
      "overview-pulse",
      "second-screen-calm"
    ];
    const movements: NodeMovementStyleId[] = ["gentle-float", "drift", "orbit", "breathing", "scatter", "swarm", "jitter", "spiral", "chaos"];
    const clickAnimations: ClickAnimationId[] = [
      "ripple",
      "double-ripple",
      "spark",
      "starburst",
      "halo",
      "pulse-ring",
      "scanner",
      "diamond-pop",
      "orbit-dots",
      "shockwave",
      "comet-bloom"
    ];
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      mode: this.pick(modes),
      visual: this.pick(visuals),
      colors: this.pick(colors),
      camera: this.pick(cameras),
      motion: {
        ...this.configuration.motion,
        animationSpeed: 0.25 + Math.random() * 0.55,
        cameraSpeed: 0.2 + Math.random() * 0.45,
        visualIntensity: 0.45 + Math.random() * 0.45,
        glowStrength: 0.35 + Math.random() * 0.65,
        colorSpeed: 0.25 + Math.random() * 0.55,
        nodeMovementEnabled: true,
        nodeMovementStyle: this.pick(movements),
        nodeMovementStrength: 0.25 + Math.random() * 0.75,
        nodeMovementSpeed: 0.25 + Math.random() * 0.75,
        particleSpeed: 0.2 + Math.random() * 0.8,
        drawingLinesEnabled: Math.random() > 0.35,
        drawingLineSpeed: 0.2 + Math.random() * 0.75,
        drawingLineStyle: this.pick(DRAWING_LINE_STYLES.map((style) => style.id)),
        clickAnimation: this.pick(clickAnimations)
      },
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    await this.persist();
  }

  async saveTemplate(): Promise<void> {
    const activeId = this.configuration.template.activeTemplateId;
    const active = this.settings.templates.find((template) => template.id === activeId);
    if (!active || active.builtIn) {
      await this.saveTemplateAs("My Constella");
      return;
    }
    this.settings = {
      ...this.settings,
      templates: this.templateManager.save(this.settings.templates, activeId, this.configuration),
      configuration: {
        ...cloneConfiguration(this.configuration),
        template: {
          activeTemplateId: activeId,
          modified: false
        }
      }
    };
    this.events.emit("templates", this.settings.templates);
    this.events.emit("configuration", this.settings.configuration);
    await this.persist();
  }

  async saveTemplateAs(name: string): Promise<void> {
    const templates = this.templateManager.saveAs(this.settings.templates, name, this.configuration);
    const created = templates[templates.length - 1];
    this.settings = {
      ...this.settings,
      templates,
      configuration: {
        ...cloneConfiguration(this.configuration),
        template: {
          activeTemplateId: created.id,
          modified: false
        }
      }
    };
    this.events.emit("templates", this.settings.templates);
    this.events.emit("configuration", this.settings.configuration);
    await this.persist();
  }

  async upsertTemplate(template: StoredTemplate, name: string, value: ActiveConfiguration): Promise<void> {
    if (template.builtIn) {
      const now = Date.now();
      this.settings = {
        ...this.settings,
        templates: [
          ...this.settings.templates,
          {
            ...template,
            id: `template-${now}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            builtIn: false,
            favorite: false,
            createdAt: now,
            updatedAt: now,
            value: {
              ...cloneConfiguration(value),
              template: {
                activeTemplateId: "",
                modified: false
              }
            }
          }
        ]
      };
      this.events.emit("templates", this.settings.templates);
      await this.persist();
      return;
    }
    this.settings = {
      ...this.settings,
      templates: this.settings.templates.map((item) => item.id === template.id ? {
        ...item,
        name,
        value: {
          ...cloneConfiguration(value),
          template: {
            activeTemplateId: item.id,
            modified: false
          }
        },
        updatedAt: Date.now()
      } : item)
    };
    this.events.emit("templates", this.settings.templates);
    await this.persist();
  }

  async loadTemplate(id: string): Promise<void> {
    const template = this.settings.templates.find((item) => item.id === id);
    if (!template) {
      return;
    }
    this.updateConfiguration({
      ...cloneConfiguration(template.value),
      template: {
        activeTemplateId: template.id,
        modified: false
      }
    });
    this.refreshGraph();
    await this.persist();
  }

  async duplicateTemplate(id: string): Promise<void> {
    this.settings = {
      ...this.settings,
      templates: this.templateManager.duplicate(this.settings.templates, id)
    };
    this.events.emit("templates", this.settings.templates);
    await this.persist();
  }

  async deleteTemplate(id: string): Promise<void> {
    this.settings = {
      ...this.settings,
      templates: this.templateManager.delete(this.settings.templates, id)
    };
    this.events.emit("templates", this.settings.templates);
    await this.persist();
  }

  async toggleTemplateFavorite(id: string): Promise<void> {
    this.settings = {
      ...this.settings,
      templates: this.templateManager.toggleFavorite(this.settings.templates, id)
    };
    this.events.emit("templates", this.settings.templates);
    await this.persist();
  }

  async createPlaylistFromCurrent(): Promise<void> {
    this.settings = {
      ...this.settings,
      playlists: this.playlistManager.createFromConfiguration(this.settings.playlists, "Current Flow", this.configuration)
    };
    this.events.emit("playlists", this.settings.playlists);
    await this.persist();
  }

  async upsertPlaylist(playlist: Playlist): Promise<void> {
    const exists = this.settings.playlists.some((item) => item.id === playlist.id && !item.builtIn);
    const next = exists
      ? this.settings.playlists.map((item) => item.id === playlist.id ? playlist : item)
      : [
          ...this.settings.playlists,
          {
            ...playlist,
            id: `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            builtIn: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        ];
    this.settings = {
      ...this.settings,
      playlists: next
    };
    this.events.emit("playlists", this.settings.playlists);
    await this.persist();
  }

  async startPlaylist(id: string): Promise<void> {
    const playlist = this.settings.playlists.find((item) => item.id === id);
    const step = playlist?.steps[0];
    if (!step) {
      return;
    }
    this.updateConfiguration({
      ...cloneConfiguration(this.configuration),
      mode: step.mode,
      visual: step.visual,
      colors: step.colors,
      camera: step.camera,
      template: {
        ...this.configuration.template,
        modified: true
      }
    });
    this.play();
    await this.persist();
  }

  exportJson(): string {
    return JSON.stringify({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      configuration: this.configuration,
      templates: this.settings.templates.filter((template) => !template.builtIn),
      playlists: this.settings.playlists.filter((playlist) => !playlist.builtIn)
    }, null, 2);
  }

  async importJson(json: string): Promise<void> {
    const parsed = JSON.parse(json) as Partial<ConstellaSettings>;
    const importedTemplates = Array.isArray(parsed.templates) ? parsed.templates : [];
    const importedPlaylists = Array.isArray(parsed.playlists) ? parsed.playlists : [];
    this.settings = {
      ...this.settings,
      templates: this.templateManager.ensureBuiltIns([...this.settings.templates, ...importedTemplates], this.configuration),
      playlists: this.playlistManager.ensureBuiltIns([...this.settings.playlists, ...importedPlaylists])
    };
    this.events.emit("templates", this.settings.templates);
    this.events.emit("playlists", this.settings.playlists);
    await this.persist();
  }

  registerVaultListeners(): void {
    this.plugin.registerEvent(this.app.metadataCache.on("resolved", () => this.refreshGraph()));
    this.plugin.registerEvent(this.app.vault.on("rename", () => this.refreshGraph()));
    this.plugin.registerEvent(this.app.vault.on("delete", () => this.refreshGraph()));
    this.plugin.registerEvent(this.app.vault.on("create", () => this.refreshGraph()));
  }

  destroy(): void {
    this.stopJourneyTimer();
    this.events.clear();
  }

  private updateConfiguration(configuration: ActiveConfiguration): void {
    this.settings = {
      ...this.settings,
      configuration
    };
    this.events.emit("configuration", configuration);
  }

  private async persist(): Promise<void> {
    await this.saveSettings(this.settings);
  }

  private startJourneyTimer(): void {
    this.stopJourneyTimer();
    this.journeyTimer = window.setInterval(() => {
      if (this.playback !== "playing" || !this.journey) {
        return;
      }
      this.journey = this.pathEngine.advance(this.journey, this.graph, this.configuration);
      this.events.emit("journey", this.journey);
      this.emitJourneySelection();
      if (!this.journey) {
        if (this.configuration.journey.afterJourney === "pause") {
          this.pause();
        } else {
          this.stop();
        }
      }
    }, 250);
  }

  private stopJourneyTimer(): void {
    if (this.journeyTimer !== null) {
      window.clearInterval(this.journeyTimer);
      this.journeyTimer = null;
    }
  }

  private emitJourneySelection(): void {
    if (!this.journey) {
      return;
    }
    const node = this.graph.nodes.find((item) => item.id === this.journey?.path[this.journey.currentIndex]) ?? null;
    this.selectedNode = node;
    this.events.emit("selectedNode", node);
    this.events.emit("journey", this.journey);
  }

  private pick<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }
}
