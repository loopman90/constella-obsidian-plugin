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

const DISPLAY_SETTING_KEYS = [
  "showGraphStatus",
  "showClusterHalos",
  "showNodeIcons",
  "densityMode",
  "depthLayers",
  "viewportLock",
  "preserveViewportOnRefresh",
  "pauseCameraAfterManualNavigation",
  "manualCameraPauseSeconds"
] as const;

type DisplaySettingKey = typeof DISPLAY_SETTING_KEYS[number];

const QUICK_UI_SETTING_KEYS = [
  "showGraphInteraction",
  "showBack",
  "showForward",
  "showNotePreview",
  "showDrawingLines",
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
  "showViewportLock",
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
        heading: "Graph interaction",
        items: [
          { name: "Interactive graph", desc: "Enable direct node dragging and configurable navigation. Fine-tune behavior in the graph's Interaction tab.", control: { type: "toggle" as const, key: "graphInteractionEnabled", defaultValue: true } },
          { name: "Interactive graph quick button", control: { type: "toggle" as const, key: "showGraphInteraction", defaultValue: true } },
          { name: "Quick UI back button", control: { type: "toggle" as const, key: "showBack", defaultValue: true } },
          { name: "Quick UI forward button", control: { type: "toggle" as const, key: "showForward", defaultValue: true } },
          { name: "Quick UI note preview", control: { type: "toggle" as const, key: "showNotePreview", defaultValue: true } }
        ]
      },
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
                balanced: "Balanced",
                custom: "Custom",
                "high-quality": "High Quality",
                "large-vault": "Large Vault",
                "low-power": "Low Power"
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
            desc: "Show the starter profile chooser when opening the graph.",
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
            name: "Glow",
            desc: "Enable the soft light around graph nodes.",
            control: {
              type: "toggle" as const,
              key: "glowEnabled",
              defaultValue: true
            }
          },
          {
            name: "Graph status bar",
            desc: "Show the note count, active filters, graph scope, and playback state at the bottom of the graph.",
            control: {
              type: "toggle" as const,
              key: "showGraphStatus",
              defaultValue: true
            }
          },
          {
            name: "Glow strength",
            visible: () => this.plugin.settings.configuration.motion.glowEnabled,
            desc: "Controls how strong the node glow appears in the graph.",
            control: {
              type: "slider" as const,
              key: "glowStrength",
              defaultValue: 0.65,
              min: 0,
              max: 1,
              step: 0.01
            }
          },
          {
            name: "Cluster halos",
            desc: "Show soft colored halos around clusters.",
            control: {
              type: "toggle" as const,
              key: "showClusterHalos",
              defaultValue: false
            }
          },
          {
            name: "Node icons",
            desc: "Show small icons for daily notes, projects, hubs, orphans, and pinned notes.",
            control: {
              type: "toggle" as const,
              key: "showNodeIcons",
              defaultValue: false
            }
          },
          {
            name: "Density mode",
            desc: "Automatically reduces labels and edge intensity in large vaults.",
            control: {
              type: "toggle" as const,
              key: "densityMode",
              defaultValue: false
            }
          },
          {
            name: "Depth layers",
            desc: "Emphasize hubs and recent notes while pushing older or weaker notes visually back.",
            control: {
              type: "toggle" as const,
              key: "depthLayers",
              defaultValue: false
            }
          },
          {
            name: "View lock",
            desc: "Prevent automatic camera movement while keeping manual pan and zoom available.",
            control: {
              type: "toggle" as const,
              key: "viewportLock",
              defaultValue: false
            }
          },
          {
            name: "Preserve viewport on refresh",
            desc: "Keep the current zoom and pan when the graph refreshes after metadata or filter changes.",
            control: {
              type: "toggle" as const,
              key: "preserveViewportOnRefresh",
              defaultValue: true
            }
          },
          {
            name: "Pause camera after manual navigation",
            desc: "Temporarily stop automatic camera movement after trackpad zooming or dragging.",
            control: {
              type: "toggle" as const,
              key: "pauseCameraAfterManualNavigation",
              defaultValue: true
            }
          },
          {
            name: "Manual camera pause seconds",
            visible: () => this.plugin.settings.configuration.display.pauseCameraAfterManualNavigation,
            desc: "How long automatic camera movement pauses after trackpad zooming or dragging.",
            control: {
              type: "slider" as const,
              key: "manualCameraPauseSeconds",
              defaultValue: 8,
              min: 0,
              max: 60,
              step: 1
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
            name: "Quick UI drawing lines",
            desc: "Show the drawing-lines toggle in the compact quick bar.",
            control: {
              type: "toggle" as const,
              key: "showDrawingLines",
              defaultValue: true
            }
          },
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
            name: "Quick UI view lock",
            desc: "Show the lock button that prevents automatic camera movement.",
            control: {
              type: "toggle" as const,
              key: "showViewportLock",
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
    if (key === "graphInteractionEnabled") return this.plugin.settings.configuration.graphInteraction.enabled;
    if (key === "performanceProfile" || key === "debug" || key === "showFirstRun") {
      return this.plugin.settings[key];
    }
    if (key === "glowStrength") {
      return this.plugin.settings.configuration.motion.glowStrength;
    }
    if (key === "glowEnabled") {
      return this.plugin.settings.configuration.motion.glowEnabled;
    }
    if (this.isDisplaySettingKey(key)) {
      return this.plugin.settings.configuration.display[key];
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
    if (key === "graphInteractionEnabled" && typeof value === "boolean") {
      await this.plugin.setInteractiveGraph(value);
      this.refreshDomState();
      return;
    }
    if (key === "showGraphInteraction" && typeof value === "boolean") {
      await this.plugin.setInteractionButtonVisible(value);
      this.refreshDomState();
      return;
    }
    if (key === "performanceProfile") {
      await this.plugin.applyPerformanceProfile(value as typeof this.plugin.settings.performanceProfile);
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
    if (key === "glowEnabled" && typeof value === "boolean") {
      this.plugin.settings.configuration = {
        ...this.plugin.settings.configuration,
        motion: {
          ...this.plugin.settings.configuration.motion,
          glowEnabled: value
        }
      };
      await this.plugin.saveConstellaSettings();
    }
    if (this.isDisplaySettingKey(key) && this.isValidDisplaySettingValue(key, value)) {
      this.plugin.settings.configuration = {
        ...this.plugin.settings.configuration,
        display: {
          ...this.plugin.settings.configuration.display,
          preserveViewportOnRefresh: key === "viewportLock" && value === true
            ? true
            : this.plugin.settings.configuration.display.preserveViewportOnRefresh,
          pauseCameraAfterManualNavigation: key === "viewportLock" && value === true
            ? true
            : this.plugin.settings.configuration.display.pauseCameraAfterManualNavigation,
          [key]: value
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
    this.refreshDomState();
  }

  private isToolSettingKey(key: string): key is ToolSettingKey {
    return TOOL_SETTING_KEYS.some((toolKey) => toolKey === key);
  }

  private isDisplaySettingKey(key: string): key is DisplaySettingKey {
    return DISPLAY_SETTING_KEYS.some((displayKey) => displayKey === key);
  }

  private isValidDisplaySettingValue(key: DisplaySettingKey, value: unknown): boolean {
    if (key === "manualCameraPauseSeconds") {
      return typeof value === "number";
    }
    return typeof value === "boolean";
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
