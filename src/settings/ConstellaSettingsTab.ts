import { PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";
import type ConstellaPlugin from "../main";

export class ConstellaSettingsTab extends PluginSettingTab {
  constructor(private readonly plugin: ConstellaPlugin) {
    super(plugin.app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: "group",
        heading: "General",
        items: [
          {
            name: "Performance profile",
            desc: "Auto is conservative and adapts later phases to vault size and frame rate.",
            control: {
              type: "dropdown",
              key: "performanceProfile",
              defaultValue: "auto",
              options: {
                auto: "Auto",
                "high-quality": "High Quality",
                balanced: "Balanced",
                "large-vault": "Large Vault",
                "low-power": "Low Power",
                custom: "Custom"
              }
            }
          },
          {
            name: "Debug mode",
            desc: "Shows extra runtime information in future debug panels.",
            control: {
              type: "toggle",
              key: "debug",
              defaultValue: false
            }
          },
          {
            name: "Show first-run experience",
            desc: "Reserved for the onboarding flow in a later phase.",
            control: {
              type: "toggle",
              key: "showFirstRun",
              defaultValue: true
            }
          }
        ]
      }
    ];
  }

  getControlValue(key: string): unknown {
    if (key === "performanceProfile" || key === "debug" || key === "showFirstRun") {
      return this.plugin.settings[key];
    }
    return undefined;
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (key === "performanceProfile") {
      this.plugin.settings.performanceProfile = value as typeof this.plugin.settings.performanceProfile;
      await this.plugin.saveConstellaSettings();
    }
    if (key === "debug" && typeof value === "boolean") {
      this.plugin.settings.debug = value;
      await this.plugin.saveConstellaSettings();
    }
    if (key === "showFirstRun" && typeof value === "boolean") {
      this.plugin.settings.showFirstRun = value;
      await this.plugin.saveConstellaSettings();
    }
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("General").setHeading();
    containerEl.createEl("p", {
      text: "Structural preferences live here. Visual exploration controls are available inside the Constella view."
    });

    new Setting(containerEl)
      .setName("Performance profile")
      .setDesc("Auto is conservative and adapts later phases to vault size and frame rate.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("auto", "Auto")
          .addOption("high-quality", "High Quality")
          .addOption("balanced", "Balanced")
          .addOption("large-vault", "Large Vault")
          .addOption("low-power", "Low Power")
          .addOption("custom", "Custom")
          .setValue(this.plugin.settings.performanceProfile)
          .onChange(async (value) => {
            this.plugin.settings.performanceProfile = value as typeof this.plugin.settings.performanceProfile;
            await this.plugin.saveConstellaSettings();
          })
      );

    new Setting(containerEl)
      .setName("Debug mode")
      .setDesc("Shows extra runtime information in future debug panels.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.debug).onChange(async (value) => {
          this.plugin.settings.debug = value;
          await this.plugin.saveConstellaSettings();
        })
      );

    new Setting(containerEl)
      .setName("Show first-run experience")
      .setDesc("Reserved for the onboarding flow in a later phase.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showFirstRun).onChange(async (value) => {
          this.plugin.settings.showFirstRun = value;
          await this.plugin.saveConstellaSettings();
        })
      );
  }
}
