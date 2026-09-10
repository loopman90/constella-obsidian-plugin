import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
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
      const status = overlays.createDiv({ cls: "constella-view-status" });
      const updateStatus = (): void => {
        const { graph, interaction, display } = this.controller.configuration;
        const count = [graph.folderFilter.trim(), graph.tagFilter.trim(), graph.dateFilter !== "all", graph.minimumConnections > 0,
          !graph.includeFloatingNotes, interaction.hiddenNodeIds.length > 0, interaction.hiddenClusterIds.length > 0, interaction.expandFromNodeId !== null].filter(Boolean).length;
        status.textContent = `${this.controller.currentGraph.nodes.length.toLocaleString()} / ${this.app.vault.getMarkdownFiles().length.toLocaleString()} notes · ${count} filters active · ${graph.scope} · ${display.viewportLock ? "Camera locked" : this.controller.playbackState}`;
        status.toggleClass("has-filters", count > 0);
      };
      this.unsubscribers.push(this.controller.events.on("configuration", updateStatus));
      this.unsubscribers.push(this.controller.events.on("graph", updateStatus));
      this.unsubscribers.push(this.controller.events.on("playback", updateStatus));
      updateStatus();

      this.controlPanel = new ControlPanel(overlays, this.controller);
      this.controlPanel.hide();
      this.nodeInfo = new NodeInfoOverlay(overlays);
      this.nodeInfo.setVisible(this.controller.configuration.display.showNodeInfoOverlay, this.controller.currentNode);
      this.quickBar = new QuickBar(overlays, this.controller, {
        togglePanel: () => this.controlPanel?.toggle(),
        toggleFullscreen: this.actions.toggleFullscreen,
        openSecondScreen: this.actions.openSecondScreen,
        exportPng: this.actions.exportPng
      });

      this.renderer = new ConstellaGraphRenderer(this.app, canvasHost, this.controller.configuration, {
        onNodeSelected: (node: GraphNode | null) => this.controller.selectNode(node),
        onNodeOpened: (node: GraphNode) => void this.controller.openNode(node)
      });

      this.unsubscribers.push(this.controller.events.on("configuration", (config) => {
        this.renderer?.setConfiguration(config);
        this.nodeInfo?.setVisible(config.display.showNodeInfoOverlay, this.controller.currentNode);
      }));
      this.unsubscribers.push(this.controller.events.on("graph", (graph) => this.renderer?.setGraph(graph)));
      this.unsubscribers.push(this.controller.events.on("selectedNode", (node) => {
        this.renderer?.setSelectedNode(node);
        this.nodeInfo?.render(node);
      }));
      this.unsubscribers.push(this.controller.events.on("journey", (journey) => {
        this.renderer?.setJourney(journey?.path ?? [], journey?.currentIndex ?? 0);
      }));
      this.controller.refreshGraph();
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
    }
  }

  async onClose(): Promise<void> {
    this.renderer?.destroy();
    this.controlPanel?.destroy();
    this.quickBar?.destroy();
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
    if (event.key === "Escape" && this.controlPanel?.isVisible()) {
      event.preventDefault();
      this.controlPanel.hide();
      return;
    }
    if ((event.target as HTMLElement | null)?.closest("input, select, textarea, [contenteditable=true]")) {
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
