import type { GraphNode } from "../core/types";

export class NodeInfoOverlay {
  private readonly rootEl: HTMLElement;
  private visible = true;

  constructor(containerEl: HTMLElement) {
    this.rootEl = containerEl.createDiv({ cls: "constella-node-info is-empty" });
    this.render(null);
  }

  render(node: GraphNode | null): void {
    if (!this.visible) {
      this.rootEl.empty();
      return;
    }

    this.rootEl.empty();

    if (!node) {
      this.rootEl.addClass("is-empty");
      this.rootEl.createDiv({ cls: "constella-node-info-title", text: "No node selected" });
      return;
    }

    this.rootEl.removeClass("is-empty");
    this.rootEl.createDiv({ cls: "constella-node-info-title", text: node.title });
    this.rootEl.createDiv({ cls: "constella-node-info-meta", text: `${node.connectionCount} connections` });
    this.rootEl.createDiv({
      cls: "constella-node-info-meta",
      text: `Modified ${new Date(node.lastModified).toLocaleDateString()}`
    });
    this.rootEl.createDiv({ cls: "constella-node-info-path", text: node.path });
  }

  setVisible(visible: boolean, node: GraphNode | null): void {
    this.visible = visible;
    this.rootEl.toggleClass("is-hidden", !visible);
    this.render(node);
  }
}
