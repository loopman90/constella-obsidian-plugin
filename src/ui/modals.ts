import { Modal, Setting } from "obsidian";
import type { App } from "obsidian";
import { CAMERAS, COLORS, MODES, TRANSITIONS, VISUALS } from "../core/types";
import type { ActiveConfiguration, CameraId, ColorsId, ModeId, Playlist, StoredTemplate, TransitionId, VisualId } from "../core/types";

export class TextPromptModal extends Modal {
  private value: string;

  constructor(app: App, private readonly title: string, initialValue: string, private readonly onSubmit: (value: string) => void | Promise<void>) {
    super(app);
    this.value = initialValue;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.title });
    new Setting(contentEl).setName("Name").addText((text) => {
      text.setValue(this.value).onChange((value) => {
        this.value = value;
      });
    });
    new Setting(contentEl).addButton((button) => {
      button.setButtonText("Save").setCta().onClick(() => {
        void this.onSubmit(this.value.trim() || "Untitled");
        this.close();
      });
    });
  }
}

export class JsonTransferModal extends Modal {
  constructor(
    app: App,
    private readonly mode: "import" | "export",
    private readonly title: string,
    private value: string,
    private readonly onSubmit: (value: string) => void | Promise<void>
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.title });
    const textarea = contentEl.createEl("textarea", { cls: "constella-json-textarea" });
    textarea.value = this.value;
    textarea.readOnly = this.mode === "export";
    textarea.addEventListener("input", () => {
      this.value = textarea.value;
    });
    new Setting(contentEl)
      .addButton((button) => {
        button.setButtonText(this.mode === "export" ? "Copy" : "Import").setCta().onClick(() => {
          if (this.mode === "export") {
            void navigator.clipboard?.writeText(textarea.value);
          } else {
            void this.onSubmit(this.value);
          }
          this.close();
        });
      })
      .addButton((button) => button.setButtonText("Close").onClick(() => this.close()));
  }
}

export class TemplateEditorModal extends Modal {
  private name: string;
  private config: ActiveConfiguration;

  constructor(app: App, private readonly template: StoredTemplate, private readonly onSave: (name: string, config: ActiveConfiguration) => void | Promise<void>) {
    super(app);
    this.name = template.name;
    this.config = structuredClone(template.value);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Edit Template" });
    new Setting(contentEl).setName("Name").addText((text) => text.setValue(this.name).onChange((value) => {
      this.name = value;
    }));
    this.dropdown(contentEl, "Mode", this.config.mode, MODES, (value) => {
      this.config.mode = value;
    });
    this.dropdown(contentEl, "Visual", this.config.visual, VISUALS, (value) => {
      this.config.visual = value;
    });
    this.dropdown(contentEl, "Colors", this.config.colors, COLORS, (value) => {
      this.config.colors = value;
    });
    this.dropdown(contentEl, "Camera", this.config.camera, CAMERAS, (value) => {
      this.config.camera = value;
    });
    new Setting(contentEl).addButton((button) => {
      button.setButtonText(this.template.builtIn ? "Save As Copy" : "Save").setCta().onClick(() => {
        void this.onSave(this.name.trim() || "Untitled Template", this.config);
        this.close();
      });
    });
  }

  private dropdown<T extends ModeId | VisualId | ColorsId | CameraId>(
    contentEl: HTMLElement,
    name: string,
    value: T,
    options: { id: T; label: string }[],
    onChange: (value: T) => void
  ): void {
    new Setting(contentEl).setName(name).addDropdown((dropdown) => {
      options.forEach((option) => {
        dropdown.addOption(option.id, option.label);
      });
      dropdown.setValue(value).onChange((next) => onChange(next as T));
    });
  }
}

export class PlaylistEditorModal extends Modal {
  private playlist: Playlist;

  constructor(app: App, playlist: Playlist, private readonly onSave: (playlist: Playlist) => void | Promise<void>) {
    super(app);
    this.playlist = structuredClone(playlist);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Edit Playlist" });
    new Setting(contentEl).setName("Name").addText((text) => text.setValue(this.playlist.name).onChange((value) => {
      this.playlist.name = value;
    }));
    new Setting(contentEl).setName("Repeat").addToggle((toggle) => toggle.setValue(this.playlist.repeat).onChange((value) => {
      this.playlist.repeat = value;
    }));
    new Setting(contentEl).setName("Shuffle").addToggle((toggle) => toggle.setValue(this.playlist.shuffle).onChange((value) => {
      this.playlist.shuffle = value;
    }));

    this.playlist.steps.forEach((step, index) => {
      contentEl.createEl("h3", { text: `Step ${index + 1}` });
      this.dropdown(contentEl, "Mode", step.mode, MODES, (value) => {
        step.mode = value;
      });
      this.dropdown(contentEl, "Visual", step.visual, VISUALS, (value) => {
        step.visual = value;
      });
      this.dropdown(contentEl, "Colors", step.colors, COLORS, (value) => {
        step.colors = value;
      });
      this.dropdown(contentEl, "Camera", step.camera, CAMERAS, (value) => {
        step.camera = value;
      });
      this.dropdown(contentEl, "Transition", step.transition, TRANSITIONS, (value) => {
        step.transition = value;
      });
      new Setting(contentEl).setName("Duration Seconds").addText((text) => text.setValue(String(step.durationSeconds)).onChange((value) => {
        step.durationSeconds = Math.max(10, Number(value) || step.durationSeconds);
      }));
    });

    new Setting(contentEl).addButton((button) => button.setButtonText("Save").setCta().onClick(() => {
      void this.onSave({ ...this.playlist, builtIn: false, updatedAt: Date.now() });
      this.close();
    }));
  }

  private dropdown<T extends ModeId | VisualId | ColorsId | CameraId | TransitionId>(
    contentEl: HTMLElement,
    name: string,
    value: T,
    options: { id: T; label: string }[],
    onChange: (value: T) => void
  ): void {
    new Setting(contentEl).setName(name).addDropdown((dropdown) => {
      options.forEach((option) => {
        dropdown.addOption(option.id, option.label);
      });
      dropdown.setValue(value).onChange((next) => onChange(next as T));
    });
  }
}
