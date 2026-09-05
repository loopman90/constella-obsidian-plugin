import type { ConstellaController } from "../core/ConstellaController";
import type { Unsubscribe } from "../core/EventBus";
import { BACKGROUNDS, CAMERAS, COLORS, MODES, NODE_MOVEMENT_STYLES, PATH_ANIMATIONS, PULSE_STYLES, VISUALS } from "../core/types";
import type { ActiveConfiguration, BackgroundId, BuiltInOption, CameraId, ColorsId, GraphScope, ModeId, NodeMovementStyleId, PathAnimationId, PulseStyleId, VisualId } from "../core/types";
import { PerformanceManager } from "../performance/PerformanceManager";
import { JsonTransferModal, PlaylistEditorModal, TemplateEditorModal, TextPromptModal } from "./modals";

type PanelSection =
  | "Quick"
  | "Presets"
  | "Graph"
  | "Visual"
  | "Background"
  | "Motion"
  | "Paths"
  | "Journey"
  | "Discovery"
  | "Display"
  | "Advanced";

const PANEL_SECTIONS: PanelSection[] = [
  "Quick",
  "Presets",
  "Graph",
  "Visual",
  "Background",
  "Motion",
  "Paths",
  "Journey",
  "Discovery",
  "Display",
  "Advanced"
];

export class ControlPanel {
  private readonly rootEl: HTMLElement;
  private readonly unsubscribers: Unsubscribe[] = [];
  private readonly performanceManager = new PerformanceManager();
  private activeSection: PanelSection = "Quick";

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
      case "Journey":
        this.renderJourney(body);
        break;
      case "Discovery":
        this.renderDiscovery(body);
        break;
      case "Display":
        this.renderDisplay(body);
        break;
      case "Advanced":
        this.renderAdvanced(body);
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

    const setup = this.section(parent, "Quick Setup", "The most-used controls in one place.");
    setup.appendChild(this.select("Graph", config.graph.scope, this.graphScopeOptions(), (value) => this.controller.updateGraphScope(value)));
    setup.appendChild(this.select("Mode", config.mode, MODES, (value) => this.controller.updateMode(value)));
    setup.appendChild(this.select("Visual", config.visual, VISUALS, (value) => this.controller.updateVisual(value)));
    setup.appendChild(this.select("Colors", config.colors, COLORS, (value) => this.controller.updateColors(value)));
    setup.appendChild(this.select("Background", config.background.style, BACKGROUNDS, (value) => this.controller.updateBackground(value)));
    setup.appendChild(this.select("Camera", config.camera, CAMERAS, (value) => this.controller.updateCamera(value)));
    setup.appendChild(this.slider("Animation Speed", config.motion.animationSpeed, (value) => this.controller.updateMotion("animationSpeed", value)));
    setup.appendChild(this.slider("Visual Intensity", config.motion.visualIntensity, (value) => this.controller.updateMotion("visualIntensity", value)));
    setup.appendChild(this.buttonGroup([
      { label: "Random Motion", onClick: () => this.controller.randomizeSafe() },
      { label: "Save Preset", onClick: () => this.controller.saveTemplate() }
    ]));
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
    this.controller.templates.forEach((template) => {
      templates.appendChild(this.templateRow(template.name, template.builtIn, template.favorite, () => this.controller.loadTemplate(template.id), () =>
        this.controller.toggleTemplateFavorite(template.id), () =>
        this.controller.duplicateTemplate(template.id), () => {
          new TemplateEditorModal(this.controller.app, template, (name, configValue) =>
            this.controller.upsertTemplate(template, name, configValue)
          ).open();
        }, () => this.controller.deleteTemplate(template.id)
      ));
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
    section.appendChild(this.select("Graph Scope", config.graph.scope, this.graphScopeOptions(), (value) => this.controller.updateGraphScope(value)));
    section.appendChild(this.numberControl("Local Depth", config.graph.localDepth, 1, 8, (value) => this.controller.updateLocalDepth(value)));
    section.appendChild(this.toggleControl("Use Current Note When Available", config.graph.useCurrentGraphWhenAvailable, (value) =>
      this.controller.updateGraphOption("useCurrentGraphWhenAvailable", value)
    ));
  }

  private renderVisual(parent: HTMLElement): void {
    const config = this.controller.configuration;
    const section = this.section(parent, "Visual Style", "Shape, color, glow, and rendering intensity.");
    section.appendChild(this.select("Visual Style", config.visual, VISUALS, (value) => this.controller.updateVisual(value)));
    section.appendChild(this.select("Color Scheme", config.colors, COLORS, (value) => this.controller.updateColors(value)));
    section.appendChild(this.slider("Color Intensity", config.motion.colorIntensity, (value) => this.controller.updateMotion("colorIntensity", value)));
    section.appendChild(this.slider("Color Speed", config.motion.colorSpeed, (value) => this.controller.updateMotion("colorSpeed", value)));
    section.appendChild(this.toggleControl("Glow", config.motion.glowEnabled, (value) => this.controller.updateMotion("glowEnabled", value)));
    section.appendChild(this.actionButton("Save Visual Preset", () => {
      new TextPromptModal(this.controller.app, "Save Visual Preset", "Visual Experiment", (name) => this.controller.saveTemplateAs(name)).open();
    }));
  }

  private renderBackground(parent: HTMLElement): void {
    const config = this.controller.configuration;
    const section = this.section(parent, "Background", "Change the canvas backdrop and ambient effects.");
    section.appendChild(this.select("Background Style", config.background.style, BACKGROUNDS, (value) => this.controller.updateBackground(value)));
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
    section.appendChild(this.slider("Drawing Line Speed", config.motion.drawingLineSpeed, (value) =>
      this.controller.updateMotion("drawingLineSpeed", value)
    ));
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
    section.appendChild(this.actionButton("Randomize Motion", () => this.controller.randomizeSafe()));
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
    section.appendChild(this.slider("Drawing Line Speed", config.motion.drawingLineSpeed, (value) =>
      this.controller.updateMotion("drawingLineSpeed", value)
    ));
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
    ], (value) => this.controller.updateJourney("deadEndBehavior", value)));
    section.appendChild(this.select("After Journey", config.journey.afterJourney, [
      { id: "start-new-journey", label: "Start New Journey" },
      { id: "zoom-out", label: "Zoom Out" },
      { id: "pause", label: "Pause" },
      { id: "stop", label: "Stop" }
    ], (value) => this.controller.updateJourney("afterJourney", value)));
    section.appendChild(this.toggleControl("Avoid Recently Visited", config.journey.avoidRecentlyVisited, (value) =>
      this.controller.updateJourney("avoidRecentlyVisited", value)
    ));
    section.appendChild(this.actionButton("Start Journey Here", () => this.controller.startJourneyFromSelected()));
    section.appendChild(this.actionButton("Suggest Node", () => this.controller.focusSuggestedNode()));
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
  }

  private renderDisplay(parent: HTMLElement): void {
    const config = this.controller.configuration;
    const section = this.section(parent, "Display", "Control the interface, overlay, and second-screen behavior.");
    section.appendChild(this.toggleControl("Hide UI", config.display.hideUi, (value) => this.controller.updateDisplay("hideUi", value)));
    section.appendChild(this.toggleControl("Node Info Overlay", config.display.showNodeInfoOverlay, (value) =>
      this.controller.updateDisplay("showNodeInfoOverlay", value)
    ));
    section.appendChild(this.toggleControl("Fullscreen Intent", config.display.fullscreen, (value) => this.controller.updateDisplay("fullscreen", value)));
    section.appendChild(this.numberControl("Hide Cursor After", config.display.autoHideCursorSeconds, 0, 60, (value) =>
      this.controller.updateDisplay("autoHideCursorSeconds", value)
    ));
    section.createDiv({
      cls: "constella-help-text",
      text: "Use Open Display Window from the command palette to launch Constella in an Obsidian pop-out window for another screen."
    });
  }

  private renderAdvanced(parent: HTMLElement): void {
    const section = this.section(parent, "Advanced", "Technical plugin status.");
    section.createDiv({
      cls: "constella-help-text",
      text: "Canvas renderer, public Obsidian metadata APIs, local-only storage, protected built-in templates, and read-only vault behavior are active."
    });
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

  private select<T extends ModeId | VisualId | ColorsId | CameraId | GraphScope | PathAnimationId | PulseStyleId | BackgroundId | NodeMovementStyleId | ActiveConfiguration["journey"]["deadEndBehavior"] | ActiveConfiguration["journey"]["afterJourney"]>(
    label: string,
    value: T,
    options: BuiltInOption<T>[],
    onChange: (value: T) => void | Promise<void>
  ): HTMLElement {
    const row = createDiv({ cls: "constella-panel-control" });
    row.createSpan({ text: label });
    const select = row.createEl("select");
    options.forEach((option) => select.createEl("option", { text: option.label, value: option.id }));
    select.value = value;
    select.addEventListener("change", () => void onChange(select.value as T));
    return row;
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
