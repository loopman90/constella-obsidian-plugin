import type { ActiveConfiguration, GraphData } from "../core/types";

export interface GraphAdapter {
  readonly id: string;
  readonly label: string;
  isAvailable(): boolean;
  read(config: ActiveConfiguration): GraphData;
}

