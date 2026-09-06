import { DEFAULT_CONFIGURATION } from "../core/ActiveConfiguration";
import type { ActiveConfiguration } from "../core/types";
import type { Playlist, StoredTemplate } from "../core/types";

export interface ConstellaSettings {
  schemaVersion: number;
  configuration: ActiveConfiguration;
  performanceProfile: "auto" | "high-quality" | "balanced" | "large-vault" | "low-power" | "custom";
  debug: boolean;
  showFirstRun: boolean;
  templates: StoredTemplate[];
  playlists: Playlist[];
  ui: {
    activePanelSection: string;
    controlPanelVisible: boolean;
  };
}

export const DEFAULT_SETTINGS: ConstellaSettings = {
  schemaVersion: 1,
  configuration: DEFAULT_CONFIGURATION,
  performanceProfile: "auto",
  debug: false,
  showFirstRun: true,
  templates: [],
  playlists: [],
  ui: {
    activePanelSection: "Quick",
    controlPanelVisible: false
  }
};

export function normalizeSettings(data: unknown): ConstellaSettings {
  if (!data || typeof data !== "object") {
    return DEFAULT_SETTINGS;
  }

  const maybe = data as Partial<ConstellaSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...maybe,
    configuration: {
      ...DEFAULT_SETTINGS.configuration,
      ...(maybe.configuration ?? {}),
      graph: {
        ...DEFAULT_SETTINGS.configuration.graph,
        ...(maybe.configuration?.graph ?? {})
      },
      motion: {
        ...DEFAULT_SETTINGS.configuration.motion,
        ...(maybe.configuration?.motion ?? {})
      },
      background: {
        ...DEFAULT_SETTINGS.configuration.background,
        ...(maybe.configuration?.background ?? {})
      },
      journey: {
        ...DEFAULT_SETTINGS.configuration.journey,
        ...(maybe.configuration?.journey ?? {})
      },
      discovery: {
        ...DEFAULT_SETTINGS.configuration.discovery,
        ...(maybe.configuration?.discovery ?? {})
      },
      display: {
        ...DEFAULT_SETTINGS.configuration.display,
        ...(maybe.configuration?.display ?? {})
      },
      quickUi: {
        ...DEFAULT_SETTINGS.configuration.quickUi,
        ...(maybe.configuration?.quickUi ?? {})
      },
      tools: {
        ...DEFAULT_SETTINGS.configuration.tools,
        ...(maybe.configuration?.tools ?? {})
      },
      interaction: {
        ...DEFAULT_SETTINGS.configuration.interaction,
        ...(maybe.configuration?.interaction ?? {}),
        pinnedNodeIds: maybe.configuration?.interaction?.pinnedNodeIds ?? DEFAULT_SETTINGS.configuration.interaction.pinnedNodeIds,
        hiddenNodeIds: maybe.configuration?.interaction?.hiddenNodeIds ?? DEFAULT_SETTINGS.configuration.interaction.hiddenNodeIds,
        hiddenClusterIds: maybe.configuration?.interaction?.hiddenClusterIds ?? DEFAULT_SETTINGS.configuration.interaction.hiddenClusterIds
      },
      template: {
        ...DEFAULT_SETTINGS.configuration.template,
        ...(maybe.configuration?.template ?? {})
      }
    },
    templates: maybe.templates ?? [],
    playlists: maybe.playlists ?? [],
    ui: {
      ...DEFAULT_SETTINGS.ui,
      ...(maybe.ui ?? {})
    }
  };
}
