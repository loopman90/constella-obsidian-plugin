import { setIcon } from "obsidian";
import type { ConstellaController } from "../core/ConstellaController";
import type { GraphNode } from "../core/types";

export class NotePreview {
  private readonly root: HTMLElement;
  private request = 0;
  private opened = false;
  constructor(container: HTMLElement, private readonly controller: ConstellaController, private readonly onClose: () => void) {
    this.root = container.createDiv({ cls: "constella-control-panel constella-preview is-hidden" });
  }
  get isVisible(): boolean { return this.opened; }
  hide(): void { this.opened = false; this.request++; this.root.addClass("is-hidden"); this.root.parentElement?.removeClass("constella-preview-open"); }
  destroy(): void { this.hide(); this.root.remove(); }
  async show(node: GraphNode | null): Promise<void> {
    this.opened = true;
    this.root.parentElement?.addClass("constella-preview-open");
    const request = ++this.request;
    this.root.removeClass("is-hidden");
    this.root.empty();
    const header = this.root.createDiv({ cls: "constella-panel-header" });
    header.createDiv({ cls: "constella-panel-title", text: node?.title ?? "Note preview" });
    const close = header.createEl("button", { cls: "clickable-icon constella-panel-close", attr: { "aria-label": "Close preview", title: "Close preview" } });
    setIcon(close, "x");
    close.addEventListener("click", () => { this.hide(); this.onClose(); });
    const content = this.root.createDiv({ cls: "constella-preview-content", attr: { role: "status" } });
    if (!node) { content.textContent = "Select a note to preview its contents."; return; }
    content.textContent = "Loading note…";
    const open = this.root.createEl("button", { text: "Open note" });
    open.disabled = true;
    open.addEventListener("click", () => {
      void this.controller.openNode(node).catch(() => {
        if (request !== this.request) return;
        content.textContent = "This note could not be opened. Refresh the graph and try again.";
      });
    });
    try {
      const file = this.controller.app.vault.getFileByPath(node.path);
      if (!file) throw new Error("missing");
      const text = await this.controller.app.vault.cachedRead(file);
      if (request !== this.request) return;
      open.disabled = false;
      content.textContent = text.trim() ? text.slice(0, 16000) : "This note is empty.";
      if (text.length > 16000) this.root.createDiv({ cls: "constella-help-text", text: "Preview truncated. Open the note to read more." });
    } catch {
      if (request !== this.request) return;
      content.textContent = "This note could not be read. It may have been moved or deleted.";
      const retry = this.root.createEl("button", { text: "Retry" });
      retry.addEventListener("click", () => void this.show(node));
    }
  }
}
