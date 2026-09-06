import { PluginSettingTab } from "obsidian";
import type ConstellaPlugin from "../main";

const TOOL_SETTING_KEYS = [
  "showMiniMap",
  "showSearchResults",
  "showGraphHealth",
  "enableSavedViews",
  "enableColorRules",
  "colorRulesText"
] as const;

type ToolSettingKey = typeof TOOL_SETTING_KEYS[number];

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
          },
          {
            name: "Mini-map",
            desc: "Show a compact graph overview in the canvas HUD.",
            control: {
              type: "toggle" as const,
              key: "showMiniMap",
              defaultValue: false
            }
          },
          {
            name: "Search results list",
            desc: "Show multiple note matches under the search field.",
            control: {
              type: "toggle" as const,
              key: "showSearchResults",
              defaultValue: true
            }
          },
          {
            name: "Graph health panel",
            desc: "Show orphans, forgotten notes, hubs, weak links, and cluster counts.",
            control: {
              type: "toggle" as const,
              key: "showGraphHealth",
              defaultValue: true
            }
          },
          {
            name: "Saved views",
            desc: "Enable saved graph view controls in the Constella panel.",
            control: {
              type: "toggle" as const,
              key: "enableSavedViews",
              defaultValue: true
            }
          },
          {
            name: "Tag and folder color rules",
            desc: "Enable custom colors for matching tags and folders.",
            control: {
              type: "toggle" as const,
              key: "enableColorRules",
              defaultValue: false
            }
          },
          {
            name: "Color rules",
            desc: "One rule per line, for example tag:project=#38bdf8 or folder:Archive=#f59e0b.",
            control: {
              type: "textarea" as const,
              key: "colorRulesText",
              defaultValue: "",
              rows: 5,
              placeholder: "tag:project=#38bdf8\nfolder:Archive=#f59e0b"
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
    if (this.isToolSettingKey(key)) {
      return this.plugin.settings.configuration.tools[key];
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
    if (this.isToolSettingKey(key) && this.isValidToolSettingValue(key, value)) {
      this.plugin.settings.configuration = {
        ...this.plugin.settings.configuration,
        tools: {
          ...this.plugin.settings.configuration.tools,
          [key]: value
        }
      };
      await this.plugin.saveConstellaSettings();
    }
  }

  private isToolSettingKey(key: string): key is ToolSettingKey {
    return TOOL_SETTING_KEYS.some((toolKey) => toolKey === key);
  }

  private isValidToolSettingValue(key: ToolSettingKey, value: unknown): boolean {
    if (key === "colorRulesText") {
      return typeof value === "string";
    }
    return typeof value === "boolean";
  }
}
