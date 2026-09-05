import { PluginSettingTab } from "obsidian";
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
        heading: "Plugin preferences",
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
}
