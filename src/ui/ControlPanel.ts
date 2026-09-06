import type { ConstellaController } from "../core/ConstellaController";
import type { Unsubscribe } from "../core/EventBus";
import { BACKGROUNDS, CAMERAS, CLICK_ANIMATIONS, COLORS, DRAWING_LINE_STYLES, MODES, NODE_MOVEMENT_STYLES, PATH_ANIMATIONS, PULSE_STYLES, VISUALS } from "../core/types";
import type { ActiveConfiguration, BackgroundId, BuiltInOption, CameraId, ClickAnimationId, ColorsId, DrawingLineStyleId, GraphNode, GraphScope, ModeId, NodeMovementStyleId, PathAnimationId, PulseStyleId, VisualId } from "../core/types";
import { PerformanceManager } from "../performance/PerformanceManager";
import { JsonTransferModal, PlaylistEditorModal, TemplateEditorModal, TextPromptModal } from "./modals";

type PanelSection =
  | "Quick"
  | "Quick UI"
  | "Presets"
  | "Graph"
  | "Visual"
  | "Background"
  | "Motion"
  | "Paths"
  | "Tools"
  | "Journey"
  | "Discovery"
  | "Display";

const PANEL_SECTIONS: PanelSection[] = [
  "Quick",
  "Quick UI",
  "Graph",
  "Tools",
  "Discovery",
  "Journey",
  "Visual",
  "Background",
  "Motion",
  "Paths",
  "Presets",
  "Display"
];

export class ControlPanel {
  private readonly rootEl: HTMLElement;
  private readonly unsubscribers: Unsubscribe[] = [];
  private readonly performanceManager = new PerformanceManager();
  private activeSection: PanelSection = "Quick";
  private searchQuery = "";

  constructor(containerEl: HTMLElement, private readonly controller: ConstellaController) {
    this.rootEl = containerEl.createDiv({ cls: "constella-control-panel" });
    this.render();
    this.unsubscribers.push(controller.events.on("configuration", () => this.render()));
    this.unsubscribers.push(controller.events.on("graph", () => this.render()));
  }

  destroy(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.rootEl.remove();
  }

  show(): void {
    this.rootEl.removeClass("is-hidden");
  }

  hide(): void {
    this.rootEl.addClass("is-hidden");
  }

  toggle(): void {
    this.rootEl.toggleClass("is-hidden", !this.rootEl.hasClass("is-hidden"));
  }

  isVisible(): boolean {
    return !this.rootEl.hasClass("is-hidden");
  }

  render(): void {
    const config = this.controller.configuration;
    const graph = this.controller.currentGraph;
    this.rootEl.empty();

    const header = this.rootEl.createDiv({ cls: "constella-panel-header" });
    header.createDiv({ cls: "constella-panel-title", text: "Constella" });
    header.createDiv({ cls: "constella-panel-subtitle", text: "Settings" });

    const stats = this.rootEl.createDiv({ cls: "constella-stats" });
    stats.createDiv({ text: `${graph.nodes.length} nodes` });
    stats.createDiv({ text: `${graph.edges.length} edges` });
    stats.createDiv({ text: config.template.modified ? "Modified" : "Clean" });

    const budget = this.performanceManager.budget(graph, config);
    if (budget.warning) {
      this.rootEl.createDiv({ cls: "constella-warning", text: budget.warning });
    }

    const tabs = this.rootEl.createDiv({ cls: "constella-panel-tabs" });
    PANEL_SECTIONS.forEach((section) => {
      const button = tabs.createEl("button", {
        cls: section === this.activeSection ? "is-active" : "",
        text: section
      });
      button.addEventListener("click", () => {
        this.activeSection = section;
        this.render();
      });
    });

    const body = this.rootEl.createDiv({ cls: "constella-panel-body" });
    switch (this.activeSection) {
      case "Quick":
        this.renderQuick(body);
        break;
      case "Quick UI":
        this.renderQuickUi(body);
        break;
      case "Presets":
        this.renderPresets(body);
        break;
      case "Graph":
        this.renderGraph(body);
        break;
      case "Visual":
        this.renderVisual(body);
        break;
      case "Background":
        this.renderBackground(body);
        break;
      case "Motion":
        this.renderMotion(body);
        break;
      case "Paths":
        this.renderPaths(body);
        break;
      case "Tools":
        this.renderTools(body);
        break;
      case "Journey":
        this.renderJourney(body);
        break;
      case "Discovery":
        this.renderDiscovery(body);
        break;
      case "Display":
        this.renderDisplay(body);
        break;
    }
  }

  private renderQuick(parent: HTMLElement): void {
    const config = this.controller.configuration;
    const playback = this.section(parent, "Playback", "Start, pause, or stop the living graph.");
    playback.appendChild(this.buttonGroup([
      { label: "Start", onClick: () => this.controller.play() },
      { label: "Pause", onClick: () => this.controller.pause() },
      { label: "Stop", onClick: () => this.controller.stop() }
    ]));

    const search = this.section(parent, "Search", "Focus a note node by title or path.");
    search.appendChild(this.searchControl());
    const current = this.controller.currentNode;
    search.createDiv({ cls: "constella-help-text", text: current ? `Focused: ${current.title}` : "No note focused" });
    search.appendChild(this.actionButton("Show All Notes", () => this.controller.showAllNotes()));

    const setup = this.section(parent, "Quick Setup", "The most-used controls in one place.");
    setup.appendChild(this.select("Graph", config.graph.scope, this.graphScopeOptions(), (value) => this.controller.updateGraphScope(value), false));
    setup.appendChild(this.select("Mode", config.mode, MODES, (value) => this.controller.updateMode(value)));
    setup.appendChild(this.select("Visual", config.visual, VISUALS, (value) => this.controller.updateVisual(value)));
    setup.appendChild(this.select("Colors", config.colors, COLORS, (value) => this.controller.updateColors(value)));
    setup.appendChild(this.select("Background", config.background.style, BACKGROUNDS, (value) => this.controller.updateBackground(value)));
    setup.appendChild(this.select("Camera", config.camera, CAMERAS, (value) => this.controller.updateCamera(value)));
    setup.appendChild(this.select("Click Animation", config.motion.clickAnimation, CLICK_ANIMATIONS, (value) =>
      this.controller.updateMotion("clickAnimation", value)
    ));
    setup.appendChild(this.slider("Animation Speed", config.motion.animationSpeed, (value) => this.controller.updateMotion("animationSpeed", value)));
    setup.appendChild(this.slider("Visual Intensity", config.motion.visualIntensity, (value) => this.controller.updateMotion("visualIntensity", value)));
    setup.appendChild(this.buttonGroup([
      { label: "Random Motion", onClick: () => this.controller.randomizeSafe() },
      { label: "Save Preset", onClick: () => this.controller.saveTemplate() }
    ]));
  }

  private renderQuickUi(parent: HTMLElement): void {
    const config = this.controller.configuration.quickUi;
    const section = this.section(parent, "Quick UI", "Choose which controls appear in the compact quick bar.");
    section.appendChild(this.toggleControl("Playback Buttons", config.showPlayback, (value) => this.controller.updateQuickUi("showPlayback", value)));
    section.appendChild(this.toggleControl("Graph Scope", config.showGraphScope, (value) => this.controller.updateQuickUi("showGraphScope", value)));
    section.appendChild(this.toggleControl("Mode Dropdown", config.showMode, (value) => this.controller.updateQuickUi("showMode", value)));
    section.appendChild(this.toggleControl("Visual Dropdown", config.showVisual, (value) => this.controller.updateQuickUi("showVisual", value)));
    section.appendChild(this.toggleControl("Color Dropdown", config.showColors, (value) => this.controller.updateQuickUi("showColors", value)));
    section.appendChild(this.toggleControl("Camera Dropdown", config.showCamera, (value) => this.controller.updateQuickUi("showCamera", value)));
    section.appendChild(this.toggleControl("Speed Slider", config.showSpeed, (value) => this.controller.updateQuickUi("showSpeed", value)));
    section.appendChild(this.toggleControl("Intensity Slider", config.showIntensity, (value) => this.controller.updateQuickUi("showIntensity", value)));
    section.appendChild(this.toggleControl("Randomize Button", config.showRandomize, (value) => this.controller.updateQuickUi("showRandomize", value)));
    section.appendChild(this.toggleControl("Save Button", config.showSave, (value) => this.controller.updateQuickUi("showSave", value)));
    section.appendChild(this.toggleControl("PNG Export Button", config.showPngExport, (value) => this.controller.updateQuickUi("showPngExport", value)));
    section.appendChild(this.toggleControl("Fullscreen Button", config.showFullscreen, (value) => this.controller.updateQuickUi("showFullscreen", value)));
    section.appendChild(this.toggleControl("Second Screen Button", config.showSecondScreen, (value) => this.controller.updateQuickUi("showSecondScreen", value)));
    section.appendChild(this.toggleControl("Settings Button", config.showSettings, (value) => this.controller.updateQuickUi("showSettings", value)));
    section.appendChild(this.toggleControl("Collapse Button", config.showCollapse, (value) => this.controller.updateQuickUi("showCollapse", value)));
    section.appendChild(this.actionButton("Reset Quick UI", () => this.controller.resetSection("quickUi")));
  }

  private renderPresets(parent: HTMLElement): void {
    const templates = this.section(parent, "Templates", "Apply, save, import, and export full Constella looks.");
    templates.appendChild(this.actionButton("Save Current", () => this.controller.saveTemplate()));
    templates.appendChild(this.actionButton("Save As", () => {
      new TextPromptModal(this.controller.app, "Save Template As", "My Constella", (name) => this.controller.saveTemplateAs(name)).open();
    }));
    templates.appendChild(this.actionButton("Export JSON", () => {
      new JsonTransferModal(this.controller.app, "export", "Export Constella", this.controller.exportJson(), async () => undefined).open();
    }));
    templates.appendChild(this.actionButton("Import JSON", () => {
      new JsonTransferModal(this.controller.app, "import", "Import Constella", "", (json) => this.controller.importJson(json)).open();
    }));
    const grouped = new Map<string, typeof this.controller.templates>();
    this.controller.templates.forEach((template) => {
      const category = this.templateCategory(template.name);
      grouped.set(category, [...(grouped.get(category) ?? []), template]);
    });
    ["Minimal", "Cinematic", "Data", "Calm", "Intense", "Utility"].forEach((category) => {
      const items = grouped.get(category);
      if (!items?.length) {
        return;
      }
      templates.createDiv({ cls: "constella-mini-list-title", text: `${category} Presets` });
      items.forEach((template) => {
        templates.appendChild(this.templateRow(template.name, template.builtIn, template.favorite, () => this.controller.loadTemplate(template.id), () =>
          this.controller.toggleTemplateFavorite(template.id), () =>
          this.controller.duplicateTemplate(template.id), () => {
            new TemplateEditorModal(this.controller.app, template, (name, configValue) =>
              this.controller.upsertTemplate(template, name, configValue)
            ).open();
          }, () => this.controller.deleteTemplate(template.id)
        ));
      });
    });

    const playlists = this.section(parent, "Playlists", "Run several looks in sequence for display mode.");
    playlists.appendChild(this.actionButton("Create From Current", () => this.controller.createPlaylistFromCurrent()));
    this.controller.playlists.forEach((playlist) => {
      playlists.appendChild(this.playlistRow(playlist.name, playlist.favorite, playlist.steps.length, () => this.controller.startPlaylist(playlist.id), () => {
        new PlaylistEditorModal(this.controller.app, playlist, (updated) => this.controller.upsertPlaylist(updated)).open();
      }));
    });
  }

  private renderGraph(parent: HTMLElement): void {
    const config = this.controller.configuration;
    const section = this.section(parent, "Graph Source", "Choose how much of your vault Constella should draw.");
    section.appendChild(this.select("Graph Scope", config.graph.scope, this.graphScopeOptions(), (value) => this.controller.updateGraphScope(value), false));
    section.appendChild(this.numberControl("Local Depth", config.graph.localDepth, 1, 50, (value) => this.controller.updateLocalDepth(value)));
    section.appendChild(this.toggleControl("Use Current Note When Available", config.graph.useCurrentGraphWhenAvailable, (value) =>
      this.controller.updateGraphOption("useCurrentGraphWhenAvailable", value)
    ));
    section.appendChild(this.toggleControl("Include Floating Notes", config.graph.includeFloatingNotes ?? true, (value) =>
      this.controller.updateGraphOption("includeFloatingNotes", value)
    ));
    section.appendChild(this.textControl("Folder Filter", config.graph.folderFilter, (value) => this.controller.updateGraphOption("folderFilter", value), "Projects, Areas"));
    section.appendChild(this.textControl("Tag Filter", config.graph.tagFilter, (value) => this.controller.updateGraphOption("tagFilter", value), "idea, project"));
    section.appendChild(this.select("Date Filter", config.graph.dateFilter, [
      { id: "all", label: "All Notes" },
      { id: "recent", label: "Recent" },
      { id: "forgotten", label: "Forgotten" }
    ], (value) => this.controller.updateGraphOption("dateFilter", value), false));
    section.appendChild(this.numberControl("Minimum Links", config.graph.minimumConnections, 0, 100, (value) =>
      this.controller.updateGraphOption("minimumConnections", value)
    ));

    const interaction = this.section(parent, "Interaction", "Pin, hide, expand, and preview paths from the focused node.");
    interaction.appendChild(this.buttonGroup([
      { label: "Pin Focused Node", onClick: () => this.controller.togglePinnedSelected() },
      { label: "Hide Node", onClick: () => this.controller.hideSelectedNode() },
      { label: "Hide Cluster", onClick: () => this.controller.hideSelectedCluster() }
    ]));
    interaction.appendChild(this.buttonGroup([
      { label: "Expand From Node", onClick: () => this.controller.expandFromSelected() },
      { label: "Set Path Start", onClick: () => this.controller.markPathPreviewPoint() },
      { label: "Clear View State", onClick: () => this.controller.clearInteractionState() }
    ]));
    interaction.createDiv({
      cls: "constella-help-text",
      text: `${config.interaction.pinnedNodeIds.length} pinned, ${config.interaction.hiddenNodeIds.length} hidden, ${config.interaction.hiddenClusterIds.length} hidden clusters`
    });
    interaction.appendChild(this.actionButton("Show All Notes", () => this.controller.showAllNotes()));
    section.appendChild(this.actionButton("Reset Graph", () => this.controller.resetSection("graph")));
  }

  private renderVisual(parent: HTMLElement): void {
    const config = this.controller.configuration;
    const section = this.section(parent, "Visual Style", "Shape, color, glow, and rendering intensity.");
    section.appendChild(this.select("Visual Style", config.visual, VISUALS, (value) => this.controller.updateVisual(value)));
    section.appendChild(this.select("Color Scheme", config.colors, COLORS, (value) => this.controller.updateColors(value)));
    section.appendChild(this.slider("Color Intensity", config.motion.colorIntensity, (value) => this.controller.updateMotion("colorIntensity", value)));
    section.appendChild(this.slider("Color Speed", config.motion.colorSpeed, (value) => this.controller.updateMotion("colorSpeed", value)));
    section.appendChild(this.toggleControl("Glow", config.motion.glowEnabled, (value) => this.controller.updateMotion("glowEnabled", value)));
    section.appendChild(this.slider("Glow Strength", config.motion.glowStrength, (value) => this.controller.updateMotion("glowStrength", value)));
    section.appendChild(this.slider("Node Size", config.display.nodeSize, (value) => this.controller.updateDisplay("nodeSize", value)));
    section.appendChild(this.slider("Edge Thickness", config.display.edgeThickness, (value) => this.controller.updateDisplay("edgeThickness", value)));
    section.appendChild(this.actionButton("Save Visual Preset", () => {
      new TextPromptModal(this.controller.app, "Save Visual Preset", "Visual Experiment", (name) => this.controller.saveTemplateAs(name)).open();
    }));
    section.appendChild(this.actionButton("Reset Visual", () => this.controller.resetSection("display")));
  }

  private renderBackground(parent: HTMLElement): void {
    const config = this.controller.configuration;
    const section = this.section(parent, "Background", "Change the canvas backdrop and ambient effects.");
    section.appendChild(this.select("Background Style", config.background.style, BACKGROUNDS, (value) => this.controller.updateBackground(value)));
    section.appendChild(this.slider("Background Intensity", config.background.intensity, (value) => this.controller.updateBackgroundOption("intensity", value)));
    section.appendChild(this.toggleControl("Background Effects", config.motion.backgroundEffectsEnabled, (value) =>
      this.controller.updateMotion("backgroundEffectsEnabled", value)
    ));
    section.appendChild(this.toggleControl("Particles", config.motion.particlesEnabled, (value) => this.controller.updateMotion("particlesEnabled", value)));
    section.appendChild(this.numberControl("Particle Amount", config.motion.particleAmount, 0, 600, (value) =>
      this.controller.updateMotion("particleAmount", value)
    ));
    section.appendChild(this.slider("Particle Speed", config.motion.particleSpeed, (value) => this.controller.updateMotion("particleSpeed", value)));
    section.appendChild(this.toggleControl("Drawing Lines", config.motion.drawingLinesEnabled, (value) =>
      this.controller.updateMotion("drawingLinesEnabled", value)
    ));
    section.appendChild(this.select("Drawing Line Style", config.motion.drawingLineStyle, DRAWING_LINE_STYLES, (value) =>
      this.controller.updateMotion("drawingLineStyle", value)
    ));
    section.appendChild(this.slider("Drawing Line Speed", config.motion.drawingLineSpeed, (value) =>
      this.controller.updateMotion("drawingLineSpeed", value)
    ));
    section.appendChild(this.actionButton("Reset Background", () => this.controller.resetSection("background")));
  }

  private renderMotion(parent: HTMLElement): void {
    const config = this.controller.configuration;
    const section = this.section(parent, "Node Motion", "Control how calmly or wildly notes move.");
    section.appendChild(this.toggleControl("Node Movement", config.motion.nodeMovementEnabled, (value) =>
      this.controller.updateMotion("nodeMovementEnabled", value)
    ));
    section.appendChild(this.select("Movement Style", config.motion.nodeMovementStyle, NODE_MOVEMENT_STYLES, (value) =>
      this.controller.updateMotion("nodeMovementStyle", value)
    ));
    section.appendChild(this.select("Click Animation", config.motion.clickAnimation, CLICK_ANIMATIONS, (value) =>
      this.controller.updateMotion("clickAnimation", value)
    ));
    section.appendChild(this.slider("Movement Strength", config.motion.nodeMovementStrength, (value) =>
      this.controller.updateMotion("nodeMovementStrength", value)
    ));
    section.appendChild(this.slider("Movement Speed", config.motion.nodeMovementSpeed, (value) =>
      this.controller.updateMotion("nodeMovementSpeed", value)
    ));
    section.appendChild(this.slider("Animation Speed", config.motion.animationSpeed, (value) =>
      this.controller.updateMotion("animationSpeed", value)
    ));
    section.appendChild(this.slider("Camera Speed", config.motion.cameraSpeed, (value) => this.controller.updateMotion("cameraSpeed", value)));
    section.appendChild(this.toggleControl("Reduce Motion", config.motion.reduceMotion, (value) => this.controller.updateMotion("reduceMotion", value)));
    section.appendChild(this.actionButton("Randomize Motion", () => this.controller.randomizeSafe()));
    section.appendChild(this.actionButton("Reset Motion", () => this.controller.resetSection("motion")));
  }

  private renderPaths(parent: HTMLElement): void {
    const config = this.controller.configuration;
    const section = this.section(parent, "Paths & Pulses", "Tune connection pulses, path animation, and drawing-line effects.");
    section.appendChild(this.toggleControl("Connection Pulses", config.motion.connectionPulsesEnabled, (value) =>
      this.controller.updateMotion("connectionPulsesEnabled", value)
    ));
    section.appendChild(this.numberControl("Pulse Amount", config.motion.pulseAmount, 1, 50, (value) =>
      this.controller.updateMotion("pulseAmount", value)
    ));
    section.appendChild(this.select("Path Animation", config.motion.pathAnimation, PATH_ANIMATIONS, (value) =>
      this.controller.updateMotion("pathAnimation", value)
    ));
    section.appendChild(this.select("Pulse Style", config.motion.pulseStyle, PULSE_STYLES, (value) => this.controller.updateMotion("pulseStyle", value)));
    section.appendChild(this.toggleControl("Drawing Lines", config.motion.drawingLinesEnabled, (value) =>
      this.controller.updateMotion("drawingLinesEnabled", value)
    ));
    section.appendChild(this.select("Drawing Line Style", config.motion.drawingLineStyle, DRAWING_LINE_STYLES, (value) =>
      this.controller.updateMotion("drawingLineStyle", value)
    ));
    section.appendChild(this.slider("Drawing Line Speed", config.motion.drawingLineSpeed, (value) =>
      this.controller.updateMotion("drawingLineSpeed", value)
    ));
    section.appendChild(this.actionButton("Reset Paths", () => this.controller.resetSection("motion")));
  }

  private renderTools(parent: HTMLElement): void {
    const config = this.controller.configuration;
    const overview = this.section(parent, "Graph Tools", "Add navigation, search, and insight helpers to the graph.");
    overview.appendChild(this.toggleControl("Mini-map", config.tools.showMiniMap, (value) => this.controller.updateTools("showMiniMap", value)));
    overview.appendChild(this.toggleControl("Search Results List", config.tools.showSearchResults, (value) =>
      this.controller.updateTools("showSearchResults", value)
    ));
    overview.appendChild(this.toggleControl("Graph Health Panel", config.tools.showGraphHealth, (value) =>
      this.controller.updateTools("showGraphHealth", value)
    ));
    overview.appendChild(this.toggleControl("Saved Views", config.tools.enableSavedViews, (value) => this.controller.updateTools("enableSavedViews", value)));
    overview.appendChild(this.toggleControl("Tag/Folder Color Rules", config.tools.enableColorRules, (value) =>
      this.controller.updateTools("enableColorRules", value)
    ));

    if (config.tools.showSearchResults) {
      const search = this.section(parent, "Search Results", "Find several matching notes before choosing one.");
      search.appendChild(this.searchControl());
    }

    if (config.tools.showGraphHealth) {
      const health = this.controller.graphHealthSummary;
      const panel = this.section(parent, "Graph Health", "Spot disconnected, forgotten, weak, and highly connected notes.");
      panel.appendChild(this.metricRow("Visible Notes", health.totalNotes));
      panel.appendChild(this.metricRow("Connections", health.totalConnections));
      panel.appendChild(this.metricRow("Clusters", health.clusterCount));
      panel.appendChild(this.nodeList("Orphans", health.orphanNotes));
      panel.appendChild(this.nodeList("Forgotten", health.forgottenNotes));
      panel.appendChild(this.nodeList("Hubs", health.hubNotes));
      panel.appendChild(this.nodeList("Weak Links", health.weakNotes));
    }

    if (config.tools.enableSavedViews) {
      const views = this.section(parent, "Saved Views", "Save and reuse complete graph setups.");
      views.appendChild(this.actionButton("Save Current View", () => {
        new TextPromptModal(this.controller.app, "Save View", "Research View", (name) => this.controller.saveTemplateAs(name)).open();
      }));
      this.controller.templates.slice(0, 8).forEach((template) => {
        views.appendChild(this.savedViewRow(template.name, () => this.controller.loadTemplate(template.id)));
      });
    }

    if (config.tools.enableColorRules) {
      const rules = this.section(parent, "Color Rules", "Use one rule per line, for example tag:project=#38bdf8 or folder:Archive=#f59e0b.");
      rules.appendChild(this.textareaControl("Rules", config.tools.colorRulesText, (value) => this.controller.updateTools("colorRulesText", value)));
    }

    overview.appendChild(this.actionButton("Reset Tools", () => this.controller.resetSection("tools")));
  }

  private renderJourney(parent: HTMLElement): void {
    const config = this.controller.configuration;
    const section = this.section(parent, "Journey", "Let Constella travel through related notes.");
    section.appendChild(this.numberControl("Minimum Nodes", config.journey.minNodes, 1, 100, (value) => this.controller.updateJourney("minNodes", value)));
    section.appendChild(this.numberControl("Maximum Nodes", config.journey.maxNodes, 1, 200, (value) => this.controller.updateJourney("maxNodes", value)));
    section.appendChild(this.numberControl("Node Pause", config.journey.nodePauseSeconds, 0.5, 60, (value) =>
      this.controller.updateJourney("nodePauseSeconds", value)
    ));
    section.appendChild(this.select("Dead End", config.journey.deadEndBehavior, [
      { id: "random-jump", label: "Random Jump" },
      { id: "new-start", label: "New Start" },
      { id: "stop", label: "Stop" }
    ], (value) => this.controller.updateJourney("deadEndBehavior", value), false));
    section.appendChild(this.select("After Journey", config.journey.afterJourney, [
      { id: "start-new-journey", label: "Start New Journey" },
      { id: "zoom-out", label: "Zoom Out" },
      { id: "pause", label: "Pause" },
      { id: "stop", label: "Stop" }
    ], (value) => this.controller.updateJourney("afterJourney", value), false));
    section.appendChild(this.toggleControl("Avoid Recently Visited", config.journey.avoidRecentlyVisited, (value) =>
      this.controller.updateJourney("avoidRecentlyVisited", value)
    ));
    section.appendChild(this.actionButton("Start Journey Here", () => this.controller.startJourneyFromSelected()));
    section.appendChild(this.actionButton("Suggest Node", () => this.controller.focusSuggestedNode()));
    section.appendChild(this.actionButton("Reset Journey", () => this.controller.resetSection("journey")));
  }

  private renderDiscovery(parent: HTMLElement): void {
    const config = this.controller.configuration;
    const section = this.section(parent, "Discovery", "Find recent notes, forgotten notes, and hubs.");
    section.appendChild(this.numberControl("Recent Days", config.discovery.recentDays, 1, 3650, (value) => this.controller.updateDiscovery("recentDays", value)));
    section.appendChild(this.numberControl("Forgotten Days", config.discovery.forgottenDays, 1, 3650, (value) =>
      this.controller.updateDiscovery("forgottenDays", value)
    ));
    section.appendChild(this.numberControl("Minimum Connections", config.discovery.minimumConnections, 0, 100, (value) =>
      this.controller.updateDiscovery("minimumConnections", value)
    ));
    section.appendChild(this.toggleControl("Include Orphans", config.discovery.includeOrphans, (value) => this.controller.updateDiscovery("includeOrphans", value)));
    section.appendChild(this.toggleControl("Exclude Templates", config.discovery.excludeTemplates, (value) =>
      this.controller.updateDiscovery("excludeTemplates", value)
    ));
    section.appendChild(this.toggleControl("Exclude Daily Notes", config.discovery.excludeDailyNotes, (value) =>
      this.controller.updateDiscovery("excludeDailyNotes", value)
    ));
    section.appendChild(this.toggleControl("Exclude Attachments", config.discovery.excludeAttachments, (value) =>
      this.controller.updateDiscovery("excludeAttachments", value)
    ));
    const summary = this.controller.discoverySummary;
    section.appendChild(this.discoveryList("Recent", summary.recent.map((node) => node.title)));
    section.appendChild(this.discoveryList("Forgotten", summary.forgotten.map((node) => node.title)));
    section.appendChild(this.discoveryList("Hubs", summary.hubs.map((node) => node.title)));
    section.appendChild(this.actionButton("Reset Discovery", () => this.controller.resetSection("discovery")));
  }

  private renderDisplay(parent: HTMLElement): void {
    const config = this.controller.configuration;
    const section = this.section(parent, "Display", "Control the interface, overlay, and second-screen behavior.");
    section.appendChild(this.toggleControl("Hide UI", config.display.hideUi, (value) => this.controller.updateDisplay("hideUi", value)));
    section.appendChild(this.toggleControl("Node Info Overlay", config.display.showNodeInfoOverlay, (value) =>
      this.controller.updateDisplay("showNodeInfoOverlay", value)
    ));
    section.appendChild(this.toggleControl("Labels", config.display.showLabels, (value) => this.controller.updateDisplay("showLabels", value)));
    section.appendChild(this.slider("Label Size", config.display.labelSize, (value) => this.controller.updateDisplay("labelSize", value)));
    section.appendChild(this.slider("Edge Thickness", config.display.edgeThickness, (value) => this.controller.updateDisplay("edgeThickness", value)));
    section.appendChild(this.slider("Node Size", config.display.nodeSize, (value) => this.controller.updateDisplay("nodeSize", value)));
    section.appendChild(this.toggleControl("Legend", config.display.showLegend, (value) => this.controller.updateDisplay("showLegend", value)));
    section.appendChild(this.toggleControl("FPS Indicator", config.display.showFps, (value) => this.controller.updateDisplay("showFps", value)));
    section.appendChild(this.toggleControl("Fullscreen Intent", config.display.fullscreen, (value) => this.controller.updateDisplay("fullscreen", value)));
    section.appendChild(this.numberControl("Hide Cursor After", config.display.autoHideCursorSeconds, 0, 60, (value) =>
      this.controller.updateDisplay("autoHideCursorSeconds", value)
    ));
    section.createDiv({
      cls: "constella-help-text",
      text: "Use Open Display Window from the command palette to launch Constella in an Obsidian pop-out window for another screen."
    });
    section.appendChild(this.actionButton("Reset Display", () => this.controller.resetSection("display")));
  }

  private section(parent: HTMLElement, title: string, help?: string): HTMLElement {
    const section = parent.createDiv({ cls: "constella-panel-section" });
    section.createEl("h3", { text: title });
    if (help) {
      section.createDiv({ cls: "constella-help-text", text: help });
    }
    return section;
  }

  private graphScopeOptions(): BuiltInOption<GraphScope>[] {
    return [
      { id: "global", label: "Global" },
      { id: "local", label: `Local depth ${this.controller.configuration.graph.localDepth}` },
      { id: "current", label: "Current Note" }
    ];
  }

  private select<T extends ModeId | VisualId | ColorsId | CameraId | GraphScope | PathAnimationId | PulseStyleId | BackgroundId | NodeMovementStyleId | ClickAnimationId | DrawingLineStyleId | ActiveConfiguration["graph"]["dateFilter"] | ActiveConfiguration["journey"]["deadEndBehavior"] | ActiveConfiguration["journey"]["afterJourney"]>(
    label: string,
    value: T,
    options: BuiltInOption<T>[],
    onChange: (value: T) => void | Promise<void>,
    sortOptions = true
  ): HTMLElement {
    const row = createDiv({ cls: "constella-panel-control" });
    row.createSpan({ text: label });
    const select = row.createEl("select");
    const orderedOptions = sortOptions ? [...options].sort((a, b) => a.label.localeCompare(b.label)) : options;
    orderedOptions.forEach((option) => select.createEl("option", { text: option.label, value: option.id }));
    select.value = value;
    select.addEventListener("change", () => void onChange(select.value as T));
    return row;
  }

  private textControl(label: string, value: string, onChange: (value: string) => void | Promise<void>, placeholder?: string): HTMLElement {
    const row = createDiv({ cls: "constella-panel-control" });
    row.createSpan({ text: label });
    const input = row.createEl("input", {
      type: "text",
      attr: {
        placeholder: placeholder ?? ""
      }
    });
    input.value = value;
    input.addEventListener("input", () => void onChange(input.value));
    return row;
  }

  private textareaControl(label: string, value: string, onChange: (value: string) => void | Promise<void>): HTMLElement {
    const row = createDiv({ cls: "constella-panel-control constella-panel-control-stacked" });
    row.createSpan({ text: label });
    const input = row.createEl("textarea", {
      attr: {
        rows: "5"
      }
    });
    input.value = value;
    input.addEventListener("change", () => void onChange(input.value));
    return row;
  }

  private searchControl(): HTMLElement {
    const box = createDiv({ cls: "constella-search-box" });
    const row = box.createDiv({ cls: "constella-panel-control" });
    row.createSpan({ text: "Find Note" });
    const input = row.createEl("input", {
      type: "text",
      attr: {
        placeholder: "Type to focus a note"
      }
    });
    input.value = this.searchQuery;
    const results = box.createDiv({ cls: "constella-search-results" });
    const renderResults = (): void => {
      results.empty();
      if (!this.controller.configuration.tools.showSearchResults) {
        return;
      }
      const matches = this.controller.searchNodes(this.searchQuery, 8);
      if (this.searchQuery.trim() && matches.length === 0) {
        results.createDiv({ cls: "constella-help-text", text: "No matching notes" });
      }
      matches.forEach((node) => {
        const button = results.createEl("button", {
          cls: "constella-search-result",
          text: `${node.title} (${node.connectionCount})`
        });
        button.addEventListener("click", () => this.controller.selectNode(node));
      });
    };
    input.addEventListener("input", () => {
      this.searchQuery = input.value;
      this.controller.focusNodeByQuery(input.value);
      renderResults();
    });
    renderResults();
    return box;
  }

  private slider(label: string, value: number, onChange: (value: number) => void | Promise<void>): HTMLElement {
    const row = createDiv({ cls: "constella-panel-control" });
    row.createSpan({ text: label });
    const input = row.createEl("input", {
      type: "range",
      attr: {
        min: "0",
        max: "1",
        step: "0.01"
      }
    });
    input.value = String(value);
    input.addEventListener("input", () => void onChange(Number(input.value)));
    return row;
  }

  private toggleControl(label: string, value: boolean, onChange: (value: boolean) => void | Promise<void>): HTMLElement {
    const row = createDiv({ cls: "constella-panel-control" });
    row.createSpan({ text: label });
    const input = row.createEl("input", { type: "checkbox" });
    input.checked = value;
    input.addEventListener("change", () => void onChange(input.checked));
    return row;
  }

  private numberControl(label: string, value: number, min: number, max: number, onChange: (value: number) => void | Promise<void>): HTMLElement {
    const row = createDiv({ cls: "constella-panel-control" });
    row.createSpan({ text: label });
    const input = row.createEl("input", {
      type: "number",
      attr: {
        min: String(min),
        max: String(max),
        step: Number.isInteger(min) && Number.isInteger(max) ? "1" : "0.5"
      }
    });
    input.value = String(value);
    input.addEventListener("change", () => void onChange(Math.max(min, Math.min(max, Number(input.value)))));
    return row;
  }

  private actionButton(label: string, onClick: () => void | Promise<void>): HTMLElement {
    const row = createDiv({ cls: "constella-panel-action" });
    const button = row.createEl("button", { text: label });
    button.addEventListener("click", () => void onClick());
    return row;
  }

  private buttonGroup(buttons: Array<{ label: string; onClick: () => void | Promise<void> }>): HTMLElement {
    const row = createDiv({ cls: "constella-button-group" });
    buttons.forEach(({ label, onClick }) => {
      const button = row.createEl("button", { text: label });
      button.addEventListener("click", () => void onClick());
    });
    return row;
  }

  private discoveryList(label: string, items: string[]): HTMLElement {
    const box = createDiv({ cls: "constella-mini-list" });
    box.createDiv({ cls: "constella-mini-list-title", text: label });
    box.createDiv({ cls: "constella-mini-list-items", text: items.slice(0, 4).join(", ") || "No matches" });
    return box;
  }

  private metricRow(label: string, value: number): HTMLElement {
    const row = createDiv({ cls: "constella-metric-row" });
    row.createSpan({ text: label });
    row.createSpan({ text: String(value) });
    return row;
  }

  private nodeList(label: string, nodes: GraphNode[]): HTMLElement {
    const box = createDiv({ cls: "constella-mini-list" });
    box.createDiv({ cls: "constella-mini-list-title", text: label });
    if (nodes.length === 0) {
      box.createDiv({ cls: "constella-mini-list-items", text: "No matches" });
      return box;
    }
    nodes.forEach((node) => {
      const button = box.createEl("button", {
        cls: "constella-health-node",
        text: `${node.title} (${node.connectionCount})`
      });
      button.addEventListener("click", () => this.controller.selectNode(node));
    });
    return box;
  }

  private savedViewRow(name: string, onApply: () => void | Promise<void>): HTMLElement {
    const row = createDiv({ cls: "constella-template-row" });
    row.createSpan({ text: name });
    const actions = row.createDiv({ cls: "constella-template-actions" });
    const apply = actions.createEl("button", { text: "Apply" });
    apply.addEventListener("click", () => void onApply());
    return row;
  }

  private templateRow(
    name: string,
    builtIn: boolean,
    favorite: boolean,
    onApply: () => void | Promise<void>,
    onFavorite: () => void | Promise<void>,
    onDuplicate: () => void | Promise<void>,
    onEdit: () => void | Promise<void>,
    onDelete: () => void | Promise<void>
  ): HTMLElement {
    const row = createDiv({ cls: "constella-template-row" });
    row.createSpan({ text: `${favorite ? "* " : ""}${name}${builtIn ? " Built-in" : ""}` });
    const actions = row.createDiv({ cls: "constella-template-actions" });
    const apply = actions.createEl("button", { text: "Apply" });
    apply.addEventListener("click", () => void onApply());
    const fav = actions.createEl("button", { text: favorite ? "Unfavorite" : "Favorite" });
    fav.addEventListener("click", () => void onFavorite());
    const duplicate = actions.createEl("button", { text: "Duplicate" });
    duplicate.addEventListener("click", () => void onDuplicate());
    const edit = actions.createEl("button", { text: "Edit" });
    edit.addEventListener("click", () => void onEdit());
    const del = actions.createEl("button", { text: "Delete" });
    del.disabled = builtIn;
    del.addEventListener("click", () => void onDelete());
    return row;
  }

  private templateCategory(name: string): "Minimal" | "Cinematic" | "Data" | "Calm" | "Intense" | "Utility" {
    const value = name.toLowerCase();
    if (/minimal|paper|clean|ink|pearl/.test(value)) {
      return "Minimal";
    }
    if (/matrix|terminal|heatmap|signal|data|blueprint|night vision|prism|infrared/.test(value)) {
      return "Data";
    }
    if (/zen|garden|library|ocean|forest|meadow|calm|soft/.test(value)) {
      return "Calm";
    }
    if (/red|alert|cyber|lava|chaos|storm|galaxy/.test(value)) {
      return "Intense";
    }
    if (/default|starter|utility|graphite|high contrast|dark mode/.test(value)) {
      return "Utility";
    }
    return "Cinematic";
  }

  private playlistRow(
    name: string,
    favorite: boolean,
    steps: number,
    onStart: () => void | Promise<void>,
    onEdit: () => void | Promise<void>
  ): HTMLElement {
    const row = createDiv({ cls: "constella-template-row" });
    row.createSpan({ text: `${favorite ? "* " : ""}${name} (${steps})` });
    const actions = row.createDiv({ cls: "constella-template-actions" });
    const start = actions.createEl("button", { text: "Start" });
    start.addEventListener("click", () => void onStart());
    const edit = actions.createEl("button", { text: "Edit" });
    edit.addEventListener("click", () => void onEdit());
    return row;
  }
}
