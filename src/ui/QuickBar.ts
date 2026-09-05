import { setIcon } from "obsidian";
import type { ConstellaController } from "../core/ConstellaController";
import type { Unsubscribe } from "../core/EventBus";
import { CAMERAS, COLORS, MODES, VISUALS } from "../core/types";
import type { BuiltInOption, CameraId, ColorsId, GraphScope, ModeId, VisualId } from "../core/types";

interface QuickBarActions {
  togglePanel: () => void;
  toggleFullscreen: () => void | Promise<void>;
  openSecondScreen: () => void | Promise<void>;
}

export class QuickBar {
  private readonly rootEl: HTMLElement;
  private readonly unsubscribers: Unsubscribe[] = [];
  private collapsed = false;

  constructor(containerEl: HTMLElement, private readonly controller: ConstellaController, private readonly actions: QuickBarActions) {
    this.rootEl = containerEl.createDiv({ cls: "constella-quick-bar" });
    this.render();
    this.unsubscribers.push(controller.events.on("configuration", () => this.render()));
    this.unsubscribers.push(controller.events.on("playback", () => this.render()));
  }

  destroy(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.rootEl.remove();
  }

  render(): void {
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

    this.rootEl.appendChild(this.iconButton("play", "Start", () => this.controller.play()));
    this.rootEl.appendChild(this.iconButton("pause", "Pause", () => this.controller.pause()));
    this.rootEl.appendChild(this.iconButton("square", "Stop", () => this.controller.stop()));
    this.rootEl.appendChild(this.select("Graph", this.controller.configuration.graph.scope, [
      { id: "global", label: "Global" },
      { id: "local", label: "Local" },
      { id: "current", label: "Current Note" }
    ], (value) => this.controller.updateGraphScope(value)));
    this.rootEl.appendChild(this.select("Mode", this.controller.configuration.mode, MODES, (value) => this.controller.updateMode(value)));
    this.rootEl.appendChild(this.select("Visual", this.controller.configuration.visual, VISUALS, (value) => this.controller.updateVisual(value)));
    this.rootEl.appendChild(this.select("Colors", this.controller.configuration.colors, COLORS, (value) => this.controller.updateColors(value)));
    this.rootEl.appendChild(this.select("Camera", this.controller.configuration.camera, CAMERAS, (value) => this.controller.updateCamera(value)));
    this.rootEl.appendChild(this.slider("Speed", this.controller.configuration.motion.animationSpeed, (value) =>
      this.controller.updateMotion("animationSpeed", value)
    ));
    this.rootEl.appendChild(this.slider("Intensity", this.controller.configuration.motion.visualIntensity, (value) =>
      this.controller.updateMotion("visualIntensity", value)
    ));
    this.rootEl.appendChild(this.iconButton("shuffle", "Smart randomize", () => this.controller.randomizeSafe()));
    this.rootEl.appendChild(this.iconButton("save", "Save current setup", () => this.controller.saveTemplate()));
    this.rootEl.appendChild(this.iconButton("maximize", "Toggle fullscreen display mode", this.actions.toggleFullscreen));
    this.rootEl.appendChild(this.iconButton("panel-top-open", "Open second-screen pop-out display", this.actions.openSecondScreen));
    this.rootEl.appendChild(this.iconButton("settings", "Open control panel", this.actions.togglePanel));
    this.rootEl.appendChild(this.iconButton("chevron-up", "Collapse quick bar", () => {
      this.collapsed = true;
      this.render();
    }));
  }

  private iconButton(icon: string, label: string, onClick: () => void | Promise<void>): HTMLButtonElement {
    const button = createEl("button", { cls: "clickable-icon constella-icon-button", attr: { "aria-label": label, title: label } });
    setIcon(button, icon);
    button.addEventListener("click", () => void onClick());
    return button;
  }

  private select<T extends ModeId | VisualId | ColorsId | CameraId | GraphScope>(
    label: string,
    value: T,
    options: BuiltInOption<T>[],
    onChange: (value: T) => void | Promise<void>
  ): HTMLElement {
    const wrapper = createDiv({ cls: "constella-select-control" });
    wrapper.createSpan({ cls: "constella-control-label", text: label });
    const select = wrapper.createEl("select");
    options.forEach((option) => {
      select.createEl("option", { text: option.label, value: option.id });
    });
    select.value = value;
    select.addEventListener("change", () => void onChange(select.value as T));
    return wrapper;
  }

  private slider(label: string, value: number, onChange: (value: number) => void | Promise<void>): HTMLElement {
    const wrapper = createDiv({ cls: "constella-slider-control" });
    wrapper.createSpan({ cls: "constella-control-label", text: label });
    const input = wrapper.createEl("input", {
      type: "range",
      attr: {
        min: "0",
        max: "1",
        step: "0.01"
      }
    });
    input.value = String(value);
    input.addEventListener("input", () => void onChange(Number(input.value)));
    return wrapper;
  }
}
