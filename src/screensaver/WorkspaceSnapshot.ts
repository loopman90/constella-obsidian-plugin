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
    const file = app.vault.getFileByPath(snapshot.activeFilePath);
    if (file) {
      await app.workspace.getLeaf(false).openFile(file);
    }
  }
}
