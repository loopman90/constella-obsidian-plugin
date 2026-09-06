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

const QUICK_UI_SETTING_KEYS = [
  "showPlayback",
  "showGraphScope",
  "showMode",
  "showVisual",
  "showColors",
  "showCamera",
  "showSpeed",
  "showIntensity",
  "showRandomize",
  "showSave",
  "showPngExport",
  "showFullscreen",
  "showSecondScreen",
  "showSettings",
  "showCollapse"
] as const;

type QuickUiSettingKey = typeof QUICK_UI_SETTING_KEYS[number];

export class ConstellaSettingsTab extends PluginSettingTab {
  constructor(private readonly plugin: ConstellaPlugin) {
    super(plugin.app, plugin);
  }

  override getSettingDefinitions() {
    return [
      {
        type: "group" as const,
        heading: "Core preferences",
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
      },
      {
        type: "group" as const,
        heading: "Visual controls",
        items: [
          {
            name: "Glow strength",
            desc: "Controls how strong the node glow appears in the graph.",
            control: {
              type: "slider" as const,
              key: "glowStrength",
              defaultValue: 0.65,
              min: 0,
              max: 1,
              step: 0.01
            }
          }
        ]
      },
      {
        type: "group" as const,
        heading: "Graph tools",
        items: [
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
      },
      {
        type: "group" as const,
        heading: "Quick UI",
        items: [
          {
            name: "Quick UI playback buttons",
            desc: "Show Start, Pause, and Stop in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showPlayback",
              defaultValue: true
            }
          },
          {
            name: "Quick UI graph scope",
            desc: "Show the graph scope dropdown in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showGraphScope",
              defaultValue: true
            }
          },
          {
            name: "Quick UI mode dropdown",
            desc: "Show the mode dropdown in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showMode",
              defaultValue: true
            }
          },
          {
            name: "Quick UI visual dropdown",
            desc: "Show the visual dropdown in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showVisual",
              defaultValue: true
            }
          },
          {
            name: "Quick UI color dropdown",
            desc: "Show the color dropdown in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showColors",
              defaultValue: true
            }
          },
          {
            name: "Quick UI camera dropdown",
            desc: "Show the camera dropdown in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showCamera",
              defaultValue: true
            }
          },
          {
            name: "Quick UI speed slider",
            desc: "Show the animation speed slider in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showSpeed",
              defaultValue: true
            }
          },
          {
            name: "Quick UI intensity slider",
            desc: "Show the visual intensity slider in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showIntensity",
              defaultValue: true
            }
          },
          {
            name: "Quick UI randomize button",
            desc: "Show the smart randomize button in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showRandomize",
              defaultValue: true
            }
          },
          {
            name: "Quick UI save button",
            desc: "Show the save current setup button in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showSave",
              defaultValue: true
            }
          },
          {
            name: "Quick UI PNG export",
            desc: "Show the PNG export button in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showPngExport",
              defaultValue: true
            }
          },
          {
            name: "Quick UI fullscreen",
            desc: "Show the fullscreen button in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showFullscreen",
              defaultValue: true
            }
          },
          {
            name: "Quick UI second screen",
            desc: "Show the second-screen pop-out button in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showSecondScreen",
              defaultValue: true
            }
          },
          {
            name: "Quick UI settings button",
            desc: "Show the control panel button in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showSettings",
              defaultValue: true
            }
          },
          {
            name: "Quick UI collapse button",
            desc: "Show the collapse button in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showCollapse",
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
    if (key === "glowStrength") {
      return this.plugin.settings.configuration.motion.glowStrength;
    }
    if (this.isToolSettingKey(key)) {
      return this.plugin.settings.configuration.tools[key];
    }
    if (this.isQuickUiSettingKey(key)) {
      return this.plugin.settings.configuration.quickUi[key];
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
    if (key === "glowStrength" && typeof value === "number") {
      this.plugin.settings.configuration = {
        ...this.plugin.settings.configuration,
        motion: {
          ...this.plugin.settings.configuration.motion,
          glowStrength: Math.max(0, Math.min(1, value))
        }
      };
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
    if (this.isQuickUiSettingKey(key) && typeof value === "boolean") {
      this.plugin.settings.configuration = {
        ...this.plugin.settings.configuration,
        quickUi: {
          ...this.plugin.settings.configuration.quickUi,
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

  private isQuickUiSettingKey(key: string): key is QuickUiSettingKey {
    return QUICK_UI_SETTING_KEYS.some((quickKey) => quickKey === key);
  }
}
