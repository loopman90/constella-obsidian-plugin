import { PluginSettingTab } from "obsidian";
import type ConstellaPlugin from "../main";

export class ConstellaSettingsTab extends PluginSettingTab {
  constructor(private readonly plugin: ConstellaPlugin) {
    super(plugin.app, plugin);
  }

  override getSettingDefinitions() {
    return [
      {
        type: "group" as const,
        items: [
          {
            name: "Performance",
            desc: "Auto is conservative and adapts later phases to vault size and frame rate.",
            control: {
              type: "dropdown" as const,
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
              type: "toggle" as const,
              key: "debug",
              defaultValue: false
            }
          },
          {
            name: "First-run experience",
            desc: "Reserved for the onboarding flow in a later phase.",
            control: {
              type: "toggle" as const,
              key: "showFirstRun",
              defaultValue: true
            }
          }
        ]
      }
    ];
  }

  override getControlValue(key: string): unknown {
    if (key === "performanceProfile" || key === "debug" || key === "showFirstRun") {
      return this.plugin.settings[key];
    }
    return undefined;
  }

  override async setControlValue(key: string, value: unknown): Promise<void> {
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
