import { TFile } from "obsidian";
import type { App } from "obsidian";

export interface WorkspaceSnapshotData {
  activeFilePath: string | null;
}

export class WorkspaceSnapshot {
  static capture(app: App): WorkspaceSnapshotData {
    return {
      activeFilePath: app.workspace.getActiveFile()?.path ?? null
    };
  }

  static async restore(app: App, snapshot: WorkspaceSnapshotData): Promise<void> {
    if (!snapshot.activeFilePath) {
      return;
    }
    const file = app.vault.getAbstractFileByPath(snapshot.activeFilePath);
    if (file instanceof TFile) {
      await app.workspace.getLeaf(false).openFile(file);
    }
  }
}
