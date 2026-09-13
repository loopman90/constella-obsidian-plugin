import { ItemView, Menu, Notice, WorkspaceLeaf, setIcon } from "obsidian";
import { NotePreview } from "./NotePreview";
import { NavigationHistory } from "./NavigationHistory";
import type { ConstellaController } from "../core/ConstellaController";
import type { GraphNode } from "../core/types";
import { ConstellaGraphRenderer } from "../graph/ConstellaGraphRenderer";
import { ControlPanel } from "./ControlPanel";
import { NodeInfoOverlay } from "./NodeInfoOverlay";
import { QuickBar } from "./QuickBar";
import type { Unsubscribe } from "../core/EventBus";

export const VIEW_TYPE_CONSTELLA = "constella-view";

interface ConstellaViewActions {
  toggleFullscreen: () => void | Promise<void>;
  openSecondScreen: () => void | Promise<void>;
  exportPng: () => void | Promise<void>;
}

export class ConstellaView extends ItemView {
  private renderer: ConstellaGraphRenderer | null = null;
  private controlPanel: ControlPanel | null = null;
  private nodeInfo: NodeInfoOverlay | null = null;
  private quickBar: QuickBar | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private preview: NotePreview | null = null;
  private history = new NavigationHistory();
  private restoring = false;
  private updatingGraph = false;
  private selectingFromCanvas = false;
  private updateNavigation = (): void => {};

  constructor(leaf: WorkspaceLeaf, private readonly controller: ConstellaController, private readonly actions: ConstellaViewActions) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_CONSTELLA;
  }

  getDisplayText(): string {
    return "Constella";
  }

  getIcon(): string {
    return "sparkles";
  }

  async onOpen(): Promise<void> {
    this.containerEl.addClass("constella-leaf");
    const container = this.contentEl;
    container.empty();
    container.addClass("constella-view");

    try {
      const stage = container.createDiv({ cls: "constella-stage" });
      const canvasHost = stage.createDiv({ cls: "constella-canvas-host" });
      const overlays = stage.createDiv({ cls: "constella-overlays" });
      const status = overlays.createEl("button", { cls: "constella-view-status", attr: { "aria-label": "Explain visible notes and filters", title: "Explain visible notes and filters" } });
      status.addEventListener("click", () => { this.preview?.hide(); this.controlPanel?.showFilters(); });
      const updateStatus = (): void => {
        const { graph, display } = this.controller.configuration;
        const count = this.controller.filterReport.length;
        status.textContent = `${this.controller.currentGraph.nodes.length.toLocaleString()} / ${this.app.vault.getMarkdownFiles().length.toLocaleString()} notes · ${count} filters active · ${graph.scope} · ${display.viewportLock ? "Camera locked" : this.controller.playbackState}`;
        status.toggleClass("has-filters", count > 0);
      };
      this.unsubscribers.push(this.controller.events.on("configuration", updateStatus));
      this.unsubscribers.push(this.controller.events.on("graph", updateStatus));
      this.unsubscribers.push(this.controller.events.on("playback", updateStatus));
      updateStatus();

      this.controlPanel = new ControlPanel(overlays, this.controller);
      this.controlPanel.hide();
      this.preview = new NotePreview(overlays, this.controller, () => previewButton.focus());
      const navigation = overlays.createDiv({ cls: "constella-navigation", attr: { role: "group", "aria-label": "Graph navigation" } });
      const navButton = (icon: string, label: string, action: () => void): HTMLButtonElement => {
        const button = navigation.createEl("button", { cls: "clickable-icon constella-icon-button", attr: { "aria-label": label, title: label } });
        setIcon(button, icon);
        button.addEventListener("click", action);
        return button;
      };
      const back = navButton("arrow-left", "Back", () => this.navigate(-1));
      const forward = navButton("arrow-right", "Forward", () => this.navigate(1));
      const previewButton = navButton("panel-right", "Note preview", () => {
        if (this.preview?.isVisible) this.preview.hide();
        else { this.controlPanel?.hide(); void this.preview?.show(this.controller.currentNode); }
      });
      this.updateNavigation = () => { back.disabled = !this.history.canBack; forward.disabled = !this.history.canForward; };
      this.updateNavigation();
      const state = overlays.createDiv({ cls: "constella-graph-state", attr: { role: "status" } });
      const updateState = (): void => {
        state.empty();
        const graphStatus = this.controller.graphStatus;
        const empty = this.controller.currentGraph.nodes.length === 0;
        state.toggleClass("is-hidden", graphStatus === "ready" && !empty);
        if (graphStatus === "ready" && !empty) return;
        state.createDiv({ text: graphStatus === "loading" ? "Loading graph…" : graphStatus === "error" ? "The graph could not be loaded." : this.app.vault.getMarkdownFiles().length ? "No notes match this view." : "This vault has no Markdown notes yet." });
        if (graphStatus === "loading") return;
        const retry = state.createEl("button", { text: "Retry" });
        retry.addEventListener("click", () => this.controller.refreshGraph());
        if (graphStatus === "ready" && this.app.vault.getMarkdownFiles().length) {
          const all = state.createEl("button", { text: "Show all notes" });
          all.addEventListener("click", () => void this.controller.showAllNotes());
        }
      };
      this.unsubscribers.push(this.controller.events.on("graphStatus", updateState));
      updateState();
      this.nodeInfo = new NodeInfoOverlay(overlays);
      this.nodeInfo.setVisible(this.controller.configuration.display.showNodeInfoOverlay, this.controller.currentNode);
      this.quickBar = new QuickBar(overlays, this.controller, {
        togglePanel: () => { this.preview?.hide(); this.controlPanel?.toggle(); },
        toggleFullscreen: this.actions.toggleFullscreen,
        openSecondScreen: this.actions.openSecondScreen,
        exportPng: this.actions.exportPng
      });

      this.renderer = new ConstellaGraphRenderer(this.app, canvasHost, this.controller.configuration, {
        onNodeSelected: (node: GraphNode | null) => this.selectFromCanvas(node),
        onNodeDragged: (node) => { void this.controller.pinDraggedNode(node); },
        onNodeContextMenu: (node, event) => {
          this.selectFromCanvas(node);
          const menu = new Menu();
          menu.addItem((item) => item.setTitle("Open note").setIcon("file-text").onClick(() => { void this.controller.openNode(node); }));
          menu.addItem((item) => item.setTitle("Preview").setIcon("panel-right").onClick(() => { this.controlPanel?.hide(); void this.preview?.show(node); }));
          menu.addItem((item) => item.setTitle("Focus").setIcon("focus").onClick(() => this.renderer?.focusNode(node)));
          menu.addItem((item) => item.setTitle(this.controller.configuration.interaction.pinnedNodeIds.includes(node.id) ? "Unpin" : "Pin").setIcon("pin").onClick(() => {
            this.selectFromCanvas(node); void this.controller.togglePinnedSelected();
          }));
          menu.addItem((item) => item.setTitle("Hide note").setIcon("eye-off").onClick(() => {
            this.selectFromCanvas(node); void this.controller.hideSelectedNode();
          }));
          menu.showAtMouseEvent(event);
        },
        onNodeOpened: (node: GraphNode) => void this.controller.openNode(node)
      });

      this.unsubscribers.push(this.controller.events.on("configuration", (config) => {
        this.renderer?.setConfiguration(config);
        this.nodeInfo?.setVisible(config.display.showNodeInfoOverlay, this.controller.currentNode);
      }));
      this.unsubscribers.push(this.controller.events.on("graph", (graph) => {
        this.updatingGraph = true;
        try { this.renderer?.setGraph(graph); } finally { this.updatingGraph = false; }
      }));
      this.unsubscribers.push(this.controller.events.on("selectedNode", (node) => {
        if (this.renderer && !this.restoring && !this.updatingGraph && this.history.currentNodeId !== (node?.id ?? null)) {
          const previous = this.renderer.getViewport();
          if (node && !this.controller.isJourneySelection && !(this.selectingFromCanvas && this.controller.configuration.graphInteraction.enabled)) this.renderer.focusNode(node);
          this.history.visit({ nodeId: node?.id ?? null, viewport: this.renderer.getViewport() }, previous);
          this.updateNavigation();
        }
        this.renderer?.setSelectedNode(node);
        this.nodeInfo?.render(node);
        if (this.preview?.isVisible) void this.preview.show(node);
      }));
      this.unsubscribers.push(this.controller.events.on("journey", (journey) => {
        this.renderer?.setJourney(journey?.path ?? [], journey?.currentIndex ?? 0);
      }));
      this.unsubscribers.push(this.controller.events.on("playback", (state) => { if (state === "playing") this.renderer?.resumeCamera(); }));
      this.controller.refreshGraph();
      this.history.visit({ nodeId: this.controller.currentNode?.id ?? null, viewport: this.renderer.getViewport() }, this.renderer.getViewport());
      if (this.controller.showFirstRun) {
        this.renderFirstRun(overlays);
      }
      this.registerDomEvent(container.ownerDocument, "keydown", this.onKeyDown);
    } catch (error) {
      console.error("Constella could not open.", error);
      new Notice("Constella could not open. Check the developer console for details.");
      container.empty();
      container.createDiv({ cls: "constella-first-run-title", text: "Constella could not open" });
      container.createDiv({ cls: "constella-first-run-copy", text: error instanceof Error ? error.message : "Unknown startup error." });
      const retry = container.createEl("button", { text: "Retry opening graph" });
      retry.addEventListener("click", () => {
        retry.disabled = true;
        void this.onClose().then(() => this.onOpen()).catch(() => {
          retry.disabled = false;
          new Notice("The graph could not be reopened. Reload Obsidian and try again.");
        });
      });
    }
  }

  async onClose(): Promise<void> {
    this.renderer?.destroy();
    this.controlPanel?.destroy();
    this.quickBar?.destroy();
    this.preview?.destroy();
    this.preview = null;
    this.history = new NavigationHistory();
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
    this.renderer = null;
    this.controlPanel = null;
    this.nodeInfo = null;
    this.quickBar = null;
    this.containerEl.removeClass("constella-leaf");
  }

  async exportPng(): Promise<void> {
    if (!this.renderer) {
      new Notice("Open Constella before exporting a PNG.");
      return;
    }
    const blob = await this.renderer.exportPng();
    const url = URL.createObjectURL(blob);
    const link = createEl("a");
    link.href = url;
    link.download = this.exportFilename();
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    new Notice("Constella PNG export started.");
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.shouldHandleKeyEvent(event)) {
      return;
    }
    if (event.defaultPrevented) return;
    if (event.key === "Escape" && this.preview?.isVisible) {
      event.preventDefault(); this.preview.hide();
      this.contentEl.querySelector<HTMLElement>('[aria-label="Note preview"]')?.focus();
      return;
    }
    if (event.key === "Escape" && this.controlPanel?.isVisible()) {
      event.preventDefault();
      this.controlPanel.hide();
      return;
    }
    if ((event.target as HTMLElement | null)?.closest("input, select, textarea, button, summary, [contenteditable=true]")) {
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      if (this.controller.playbackState === "playing") {
        this.controller.pause();
      } else {
        this.controller.play();
      }
    }
    if (event.key === "ArrowLeft") {
      this.controller.previousJourneyNode();
    }
    if (event.key === "ArrowRight") {
      this.controller.nextJourneyNode();
    }
    if (event.key === "Enter" && this.controller.currentNode) {
      void this.controller.openNode(this.controller.currentNode);
    }
    if (event.key === "Escape") {
      this.controller.stop();
    }
  };

  private shouldHandleKeyEvent(event: KeyboardEvent): boolean {
    const target = event.target;
    if (target && this.containerEl.contains(target as Node)) {
      return true;
    }
    return this.app.workspace.getActiveViewOfType(ConstellaView) === this;
  }

  private navigate(direction: -1 | 1): void {
    if (!this.renderer) return;
    const entry = this.history.move(direction, this.renderer.getViewport());
    if (!entry) return;
    this.restoring = true;
    try {
      this.controller.pause();
      const node = this.controller.currentGraph.nodes.find((item) => item.id === entry.nodeId) ?? null;
      if (entry.nodeId && !node) new Notice("That note is no longer in this view. Check the active filters or show all notes.");
      this.controller.selectNode(node);
      this.renderer.restoreViewport(entry.viewport);
    } finally { this.restoring = false; }
    this.updateNavigation();
  }

  private selectFromCanvas(node: GraphNode | null): void {
    this.selectingFromCanvas = true;
    try { this.controller.selectNode(node); } finally { this.selectingFromCanvas = false; }
  }

  private renderFirstRun(containerEl: HTMLElement): void {
    const firstRun = containerEl.createDiv({ cls: "constella-first-run" });
    firstRun.createDiv({ cls: "constella-first-run-kicker", text: "First setup" });
    firstRun.createDiv({ cls: "constella-first-run-title", text: "Choose how Constella should start" });
    firstRun.createDiv({
      cls: "constella-first-run-copy",
      text: "Pick one safe starter profile. You can change every setting later from the Control Panel."
    });
    const actions = firstRun.createDiv({ cls: "constella-first-run-actions" });
    this.firstRunButton(actions, "Calm", "Quiet graph, readable labels, gentle motion.", async () => {
      await this.controller.loadTemplate("builtin-calm");
      await this.controller.applyPerformanceProfile("balanced");
      await this.controller.dismissFirstRun();
      firstRun.remove();
    });
    this.firstRunButton(actions, "Research", "Balanced exploration with graph tools visible.", async () => {
      await this.controller.applyPerformanceProfile("balanced");
      await this.controller.updateMode("research-trail");
      await this.controller.updateVisual("research-board");
      await this.controller.updateColors("notebook-blue");
      await this.controller.dismissFirstRun();
      firstRun.remove();
    });
    this.firstRunButton(actions, "Presentation", "Cinematic visuals for fullscreen or second screen.", async () => {
      await this.controller.applyPerformanceProfile("high-quality");
      await this.controller.updateMode("path-journey");
      await this.controller.updateVisual("deep-space");
      await this.controller.updateColors("aurora");
      await this.controller.updateCamera("cinematic");
      this.controller.play();
      await this.controller.dismissFirstRun();
      firstRun.remove();
    });
    this.firstRunButton(actions, "Large Vault", "Faster defaults for big vaults and laptops.", async () => {
      await this.controller.applyPerformanceProfile("large-vault");
      await this.controller.updateMode("hub-explorer");
      await this.controller.updateVisual("clean");
      await this.controller.updateColors("graphite");
      await this.controller.dismissFirstRun();
      firstRun.remove();
    });
    const footer = firstRun.createDiv({ cls: "constella-first-run-footer" });
    this.firstRunButton(footer, "Skip setup", "Keep defaults and open the graph.", async () => {
      await this.controller.dismissFirstRun();
      firstRun.remove();
    });
  }

  private firstRunButton(containerEl: HTMLElement, label: string, description: string, onClick: () => Promise<void>): void {
    const button = containerEl.createEl("button", { cls: "constella-first-run-option" });
    button.createSpan({ cls: "constella-first-run-option-title", text: label });
    button.createSpan({ cls: "constella-first-run-option-copy", text: description });
    button.addEventListener("click", () => void onClick());
  }

  private exportFilename(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `constella-graph-${timestamp}.png`;
  }
}
