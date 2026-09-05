import { Plugin, TFile } from "obsidian";
import { ConstellaController } from "./core/ConstellaController";
import { ConstellaSettingsTab } from "./settings/ConstellaSettingsTab";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings/Settings";
import type { ConstellaSettings } from "./settings/Settings";
import { ConstellaView, VIEW_TYPE_CONSTELLA } from "./ui/ConstellaView";
import { DisplayModeController } from "./display/DisplayModeController";
import { JsonTransferModal, PlaylistEditorModal, TemplateEditorModal } from "./ui/modals";

export default class ConstellaPlugin extends Plugin {
  settings: ConstellaSettings = DEFAULT_SETTINGS;
  private controller: ConstellaController | null = null;
  private readonly displayModeController = new DisplayModeController();
  private statusBarEl: HTMLElement | null = null;

  async onload(): Promise<void> {
    await this.loadConstellaSettings();
    this.controller = new ConstellaController(this.app, this, this.settings, async (settings) => {
      this.settings = settings;
      await this.saveConstellaSettings();
    });
    this.controller.registerVaultListeners();

    this.registerView(VIEW_TYPE_CONSTELLA, (leaf) => new ConstellaView(leaf, this.requireController(), {
      toggleFullscreen: () => this.toggleFullscreenDisplayMode(),
      openSecondScreen: () => this.openSecondScreenDisplay()
    }));
    this.addRibbonIcon("sparkles", "Open Constella", () => void this.activateView());
    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass("constella-status");
    this.statusBarEl.setText("Constella: Idle");
    this.statusBarEl.addEventListener("click", () => void this.activateView());

    this.registerCommands();
    this.registerContextMenus();
    this.addSettingTab(new ConstellaSettingsTab(this));

    this.controller.events.on("playback", (state) => {
      this.statusBarEl?.setText(`Constella: ${state[0].toUpperCase()}${state.slice(1)}`);
    });
  }

  onunload(): void {
    this.controller?.destroy();
    this.controller = null;
  }

  async loadConstellaSettings(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
  }

  async saveConstellaSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_CONSTELLA)[0];
    if (existing) {
      await this.app.workspace.revealLeaf(existing);
      return;
    }

    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE_CONSTELLA, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  private registerCommands(): void {
    this.addCommand({
      id: "open",
      name: "Open",
      callback: () => void this.activateView()
    });
    this.addCommand({
      id: "start",
      name: "Start",
      callback: () => this.requireController().play()
    });
    this.addCommand({
      id: "pause",
      name: "Pause",
      callback: () => this.requireController().pause()
    });
    this.addCommand({
      id: "stop",
      name: "Stop",
      callback: () => this.requireController().stop()
    });
    this.addCommand({
      id: "toggle",
      name: "Toggle",
      callback: () => {
        const controller = this.requireController();
        if (controller.playbackState === "playing") {
          controller.pause();
        } else {
          controller.play();
        }
      }
    });
    this.addCommand({
      id: "open-controls",
      name: "Open Controls",
      callback: () => void this.activateView()
    });
    this.addCommand({
      id: "randomize",
      name: "Randomize",
      callback: () => void this.requireController().randomizeSafe()
    });
    this.addCommand({
      id: "start-path-journey",
      name: "Start Path Journey",
      callback: async () => {
        await this.requireController().updateMode("path-journey");
        this.requireController().play();
      }
    });
    this.addCommand({
      id: "start-wander",
      name: "Start Wander",
      callback: async () => {
        await this.requireController().updateMode("wander");
        this.requireController().play();
      }
    });
    this.addCommand({
      id: "open-playground",
      name: "Open Playground",
      callback: async () => {
        await this.activateView();
        await this.requireController().randomizeSafe();
      }
    });
    this.addCommand({
      id: "open-templates",
      name: "Open Templates",
      callback: () => void this.activateView()
    });
    this.addCommand({
      id: "edit-active-template",
      name: "Edit Active Template",
      callback: () => {
        const controller = this.requireController();
        const template = controller.templates.find((item) => item.id === controller.configuration.template.activeTemplateId) ?? controller.templates[0];
        if (template) {
          new TemplateEditorModal(this.app, template, (name, config) => controller.upsertTemplate(template, name, config)).open();
        }
      }
    });
    this.addCommand({
      id: "edit-first-playlist",
      name: "Edit Playlist",
      callback: () => {
        const controller = this.requireController();
        const playlist = controller.playlists[0];
        if (playlist) {
          new PlaylistEditorModal(this.app, playlist, (updated) => controller.upsertPlaylist(updated)).open();
        }
      }
    });
    this.addCommand({
      id: "export-json",
      name: "Export Templates and Playlists",
      callback: () => {
        new JsonTransferModal(this.app, "export", "Export Constella", this.requireController().exportJson(), async () => undefined).open();
      }
    });
    this.addCommand({
      id: "import-json",
      name: "Import Templates and Playlists",
      callback: () => {
        new JsonTransferModal(this.app, "import", "Import Constella", "", (json) => this.requireController().importJson(json)).open();
      }
    });
    this.addCommand({
      id: "start-playlist",
      name: "Start Playlist",
      callback: () => {
        const playlist = this.requireController().playlists[0];
        if (playlist) {
          void this.requireController().startPlaylist(playlist.id);
        }
      }
    });
    this.addCommand({
      id: "start-screensaver",
      name: "Start Screensaver",
      callback: async () => {
        await this.activateView();
        this.requireController().play();
        await this.displayModeController.enter(document.body, true);
      }
    });
    this.addCommand({
      id: "start-display-mode",
      name: "Start Display Mode",
      callback: () => void this.startDisplayMode()
    });
    this.addCommand({
      id: "open-display-window",
      name: "Open Display Window",
      callback: () => void this.openSecondScreenDisplay()
    });
    this.addCommand({
      id: "focus-current-note",
      name: "Focus Current Note",
      callback: async () => {
        await this.activateView();
        await this.requireController().updateGraphScope("current");
      }
    });
    this.addCommand({
      id: "save-current-setup",
      name: "Save Current Setup",
      callback: () => void this.requireController().saveTemplate()
    });
    this.addCommand({
      id: "toggle-fullscreen",
      name: "Toggle Fullscreen",
      callback: () => void this.toggleFullscreenDisplayMode()
    });
  }

  private async startDisplayMode(): Promise<void> {
    await this.activateView();
    this.requireController().play();
    await this.displayModeController.enter(document.body, this.requireController().configuration.display.hideUi);
  }

  private async toggleFullscreenDisplayMode(): Promise<void> {
    if (document.fullscreenElement) {
      await this.displayModeController.exit(document.body);
      return;
    }
    await this.startDisplayMode();
  }

  private async openSecondScreenDisplay(): Promise<void> {
    const leaf = this.app.workspace.openPopoutLeaf();
    await leaf.setViewState({ type: VIEW_TYPE_CONSTELLA, active: true });
    this.requireController().play();
  }

  private registerContextMenus(): void {
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      if (!(file instanceof TFile) || file.extension !== "md") {
        return;
      }
      menu.addItem((item) => {
        item
          .setTitle("Start Constella Journey from this note")
          .setIcon("sparkles")
          .onClick(async () => {
            await this.activateView();
            await this.requireController().startJourneyFromPath(file.path);
          });
      });
    }));
  }

  private requireController(): ConstellaController {
    if (!this.controller) {
      throw new Error("Constella controller is not initialized.");
    }
    return this.controller;
  }
}
