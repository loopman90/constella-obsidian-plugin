import { setIcon } from "obsidian";
import { sliderControl } from "./SliderControl";
import { DEFAULT_CONFIGURATION } from "../core/ActiveConfiguration";
import type { ConstellaController } from "../core/ConstellaController";
import type { Unsubscribe } from "../core/EventBus";
import { CAMERAS, COLORS, MODES, VISUALS } from "../core/types";
import type { BuiltInOption, CameraId, ColorsId, GraphScope, ModeId, VisualId } from "../core/types";

interface QuickBarActions {
  togglePanel: () => void;
  toggleFullscreen: () => void | Promise<void>;
  openSecondScreen: () => void | Promise<void>;
  exportPng: () => void | Promise<void>;
}

export class QuickBar {
  private readonly rootEl: HTMLElement;
  private readonly unsubscribers: Unsubscribe[] = [];
  private collapsed = false;
  private moreOpen = false;
  private compact = false;
  private readonly resizeObserver: ResizeObserver;

  constructor(containerEl: HTMLElement, private readonly controller: ConstellaController, private readonly actions: QuickBarActions) {
    this.rootEl = containerEl.createDiv({ cls: "constella-quick-bar" });
    this.compact = containerEl.clientWidth < 850;
    this.resizeObserver = new ResizeObserver(() => {
      const compact = containerEl.clientWidth < 850;
      if (compact !== this.compact) { this.compact = compact; this.render(); }
    });
    this.resizeObserver.observe(containerEl);
    this.render();
    this.unsubscribers.push(controller.events.on("configuration", () => this.render()));
    this.unsubscribers.push(controller.events.on("playback", () => this.render()));
  }

  destroy(): void {
    this.rootEl.parentElement?.removeClass("constella-more-open");
    this.resizeObserver.disconnect();
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.rootEl.remove();
  }

  render(): void {
    this.rootEl.parentElement?.removeClass("constella-more-open");
    this.rootEl.empty();
    this.rootEl.toggleClass("is-collapsed", this.collapsed);

    if (this.collapsed) {
      const expand = this.iconButton("sparkles", "Open Constella controls", () => {
        this.collapsed = false;
        this.render();
      });
      expand.addClass("constella-brand-button");
      this.rootEl.appendChild(expand);
      return;
    }

    const quickUi = this.controller.configuration.quickUi;
    if (quickUi.showPlayback) {
      this.rootEl.appendChild(this.iconButton("play", "Start", () => this.controller.play()));
      this.rootEl.appendChild(this.iconButton("pause", "Pause", () => this.controller.pause()));
      this.rootEl.appendChild(this.iconButton("square", "Stop", () => this.controller.stop()));
    }
    if (quickUi.showGraphScope) {
      this.rootEl.appendChild(this.select("Graph", this.controller.configuration.graph.scope, [
        { id: "global", label: "Global" },
        { id: "local", label: "Local" },
        { id: "current", label: "Current Note" }
      ], (value) => this.controller.updateGraphScope(value), false));
    }
    if (quickUi.showMode) {
      this.rootEl.appendChild(this.select("Mode", this.controller.configuration.mode, MODES, (value) => this.controller.updateMode(value)));
    }
    if (quickUi.showVisual) {
      this.rootEl.appendChild(this.select("Visual", this.controller.configuration.visual, VISUALS, (value) => this.controller.updateVisual(value)));
    }
    if (quickUi.showColors) {
      this.rootEl.appendChild(this.select("Colors", this.controller.configuration.colors, COLORS, (value) => this.controller.updateColors(value)));
    }
    if (quickUi.showCamera) {
      this.rootEl.appendChild(this.select("Camera", this.controller.configuration.camera, CAMERAS, (value) => this.controller.updateCamera(value)));
    }
    if (quickUi.showSpeed) {
      this.rootEl.appendChild(this.slider("Speed", this.controller.configuration.motion.animationSpeed, (value) =>
        this.controller.updateMotion("animationSpeed", value)
      ));
    }
    if (quickUi.showIntensity) {
      this.rootEl.appendChild(this.slider("Intensity", this.controller.configuration.motion.visualIntensity, (value) =>
        this.controller.updateMotion("visualIntensity", value)
      ));
    }
    if (quickUi.showRandomize) {
      this.rootEl.appendChild(this.iconButton("shuffle", "Smart randomize", () => this.controller.randomizeSafe()));
    }
    if (quickUi.showSave) {
      this.rootEl.appendChild(this.iconButton("save", "Save current setup", () => this.controller.saveTemplate()));
    }
    if (quickUi.showPngExport) {
      this.rootEl.appendChild(this.iconButton("image-down", "Export graph as PNG", this.actions.exportPng));
    }
    if (quickUi.showViewportLock) {
      const locked = this.controller.configuration.display.viewportLock;
      const button = this.iconButton(locked ? "lock" : "unlock", locked ? "Unlock view" : "Lock view", () =>
        this.controller.toggleViewportLock()
      );
      button.toggleClass("is-active", locked);
      this.rootEl.appendChild(button);
    }
    if (quickUi.showFullscreen) {
      this.rootEl.appendChild(this.iconButton("maximize", "Toggle fullscreen display mode", this.actions.toggleFullscreen));
    }
    if (quickUi.showSecondScreen) {
      this.rootEl.appendChild(this.iconButton("panel-top-open", "Open second-screen pop-out display", this.actions.openSecondScreen));
    }
    if (quickUi.showSettings || this.rootEl.children.length === 0) {
      this.rootEl.appendChild(this.iconButton("settings", "Open control panel", this.actions.togglePanel));
    }
    if (quickUi.showCollapse) {
      this.rootEl.appendChild(this.iconButton("chevron-up", "Collapse quick bar", () => {
        this.collapsed = true;
        this.render();
      }));
    }
    this.groupControls();
  }

  private groupControls(): void {
    const controls = Array.from(this.rootEl.children);
    const navigation = this.rootEl.createDiv({ cls: "constella-quick-group", attr: { role: "group", "aria-label": "Navigation" } });
    const appearance = this.rootEl.createDiv({ cls: "constella-quick-group constella-quick-appearance", attr: { role: "group", "aria-label": "Appearance" } });
    const actions = this.rootEl.createDiv({ cls: "constella-quick-group", attr: { role: "group", "aria-label": "Actions" } });
    const more = this.rootEl.createEl("details", { cls: "constella-quick-more" });
    more.open = this.moreOpen;
    const summary = more.createEl("summary", { cls: "constella-icon-button", attr: { title: "More controls", "aria-label": "More controls" } });
    setIcon(summary, "ellipsis");
    const menu = more.createDiv({ cls: "constella-quick-menu" });
    more.addEventListener("toggle", () => {
      if (!this.rootEl.contains(more)) return;
      this.moreOpen = more.open;
      this.rootEl.parentElement?.toggleClass("constella-more-open", more.open);
    });
    more.addEventListener("keydown", (event) => { if (event.key === "Escape") { event.stopPropagation(); more.open = false; summary.focus(); } });
    controls.forEach((control) => {
      const label = control.getAttribute("aria-label") ?? control.firstElementChild?.textContent ?? "";
      const group = (["Start", "Pause", "Stop", "Lock view", "Unlock view"].includes(label) || (label === "Graph" && !this.compact)) ? navigation
        : ["Visual", "Colors"].includes(label) && !this.compact ? appearance
        : ["Open control panel", "Toggle fullscreen display mode", "Collapse quick bar"].includes(label) ? actions : menu;
      group.appendChild(control);
      const active = (label === "Start" && this.controller.playbackState === "playing")
        || (label === "Pause" && this.controller.playbackState === "paused")
        || (label === "Stop" && this.controller.playbackState === "idle")
        || label === "Unlock view"
        || (label === "Toggle fullscreen display mode" && this.controller.configuration.display.fullscreen);
      if (control.tagName === "BUTTON") {
        control.classList.toggle("is-active", active);
        control.setAttribute("aria-pressed", String(active));
      }
    });
    [navigation, appearance, actions].forEach((group) => { if (!group.children.length) group.remove(); });
    if (!menu.children.length) more.remove();
    this.rootEl.parentElement?.toggleClass("constella-more-open", this.rootEl.contains(more) && more.open);
  }

  private iconButton(icon: string, label: string, onClick: () => void | Promise<void>): HTMLButtonElement {
    const button = createEl("button", { cls: "clickable-icon constella-icon-button", attr: { "aria-label": label, title: label } });
    setIcon(button, icon);
    button.addEventListener("click", () => {
      if (label === "Open control panel") {
        this.moreOpen = false;
        const more = this.rootEl.querySelector("details");
        if (more) more.open = false;
      }
      void onClick();
    });
    return button;
  }

  private select<T extends ModeId | VisualId | ColorsId | CameraId | GraphScope>(
    label: string,
    value: T,
    options: BuiltInOption<T>[],
    onChange: (value: T) => void | Promise<void>,
    sortOptions = true
  ): HTMLElement {
    const wrapper = createDiv({ cls: "constella-select-control" });
    wrapper.createSpan({ cls: "constella-control-label", text: label });
    const select = wrapper.createEl("select");
    const orderedOptions = [...options].sort((a, b) => a.label.localeCompare(b.label));
    select.setAttribute("aria-label", label);
    orderedOptions.forEach((option) => {
      select.createEl("option", { text: option.label, value: option.id });
    });
    select.value = value;
    select.addEventListener("change", () => void onChange(select.value as T));
    return wrapper;
  }

  private slider(label: string, value: number, onChange: (value: number) => void | Promise<void>): HTMLElement {
    return sliderControl(label, value, label === "Speed" ? DEFAULT_CONFIGURATION.motion.animationSpeed : DEFAULT_CONFIGURATION.motion.visualIntensity, onChange);
  }
}
