import type { Viewport } from "../core/types";

export interface NavigationEntry { nodeId: string | null; viewport: Viewport }

export class NavigationHistory {
  private entries: NavigationEntry[] = [];
  private index = -1;
  get canBack(): boolean { return this.index > 0; }
  get canForward(): boolean { return this.index < this.entries.length - 1; }
  get currentNodeId(): string | null | undefined { return this.entries[this.index]?.nodeId; }

  visit(entry: NavigationEntry, previousViewport: Viewport): void {
    const current = this.entries[this.index];
    if (current?.nodeId === entry.nodeId) return;
    if (current) current.viewport = { ...previousViewport };
    this.entries = this.entries.slice(0, this.index + 1);
    this.entries.push({ nodeId: entry.nodeId, viewport: { ...entry.viewport } });
    if (this.entries.length > 100) this.entries.shift();
    this.index = this.entries.length - 1;
  }

  move(direction: -1 | 1, viewport: Viewport): NavigationEntry | null {
    if (direction === -1 ? !this.canBack : !this.canForward) return null;
    this.entries[this.index].viewport = { ...viewport };
    this.index += direction;
    const entry = this.entries[this.index];
    return { nodeId: entry.nodeId, viewport: { ...entry.viewport } };
  }
}
