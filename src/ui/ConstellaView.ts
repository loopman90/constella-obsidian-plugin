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
    container.style.position = "relative";
    container.style.height = "100%";
    container.style.padding = "0";
    container.style.overflow = "hidden";

    try {
      const stage = container.createDiv({ cls: "constella-stage" });
      stage.style.position = "absolute";
      stage.style.inset = "0";
      stage.style.minHeight = "360px";
      const canvasHost = stage.createDiv({ cls: "constella-canvas-host" });
      canvasHost.style.position = "absolute";
      canvasHost.style.inset = "0";
      const overlays = stage.createDiv({ cls: "constella-overlays" });

      this.controlPanel = new ControlPanel(overlays, this.controller);
      this.controlPanel.hide();
      this.nodeInfo = new NodeInfoOverlay(overlays);
      this.nodeInfo.setVisible(this.controller.configuration.display.showNodeInfoOverlay, this.controller.currentNode);
      this.quickBar = new QuickBar(overlays, this.controller, {
        togglePanel: () => this.controlPanel?.toggle(),
        toggleFullscreen: this.actions.toggleFullscreen,
        openSecondScreen: this.actions.openSecondScreen
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
      this.registerDomEvent(document, "keydown", this.onKeyDown);
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

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.shouldHandleKeyEvent(event)) {
      return;
    }
    if (event.key === "Escape" && this.controlPanel?.isVisible()) {
      event.preventDefault();
      this.controlPanel.hide();
      return;
    }
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) {
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
    if (target instanceof Node && this.containerEl.contains(target)) {
      return true;
    }
    return this.app.workspace.getActiveViewOfType(ConstellaView) === this;
  }

  private renderFirstRun(containerEl: HTMLElement): void {
    const firstRun = containerEl.createDiv({ cls: "constella-first-run" });
    firstRun.createDiv({ cls: "constella-first-run-title", text: "Welcome to Constella" });
    firstRun.createDiv({ cls: "constella-first-run-copy", text: "Turn your vault into a living network." });
    const actions = firstRun.createDiv({ cls: "constella-first-run-actions" });
    this.firstRunButton(actions, "Start Cinematic", async () => {
      await this.controller.updateMode("path-journey");
      await this.controller.updateVisual("deep-space");
      await this.controller.updateColors("aurora");
      await this.controller.updateCamera("cinematic");
      this.controller.play();
      await this.controller.dismissFirstRun();
      firstRun.remove();
    });
    this.firstRunButton(actions, "Start Constellation", async () => {
      await this.controller.loadTemplate("builtin-constellation");
      this.controller.play();
      await this.controller.dismissFirstRun();
      firstRun.remove();
    });
    this.firstRunButton(actions, "Open Playground", async () => {
      await this.controller.randomizeSafe();
      await this.controller.dismissFirstRun();
      firstRun.remove();
    });
    this.firstRunButton(actions, "Skip", async () => {
      await this.controller.dismissFirstRun();
      firstRun.remove();
    });
  }

  private firstRunButton(containerEl: HTMLElement, label: string, onClick: () => Promise<void>): void {
    const button = containerEl.createEl("button", { text: label });
    button.addEventListener("click", () => void onClick());
  }
}
