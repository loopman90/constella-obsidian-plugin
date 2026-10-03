import { Modal, Notice, Setting, getAllTags } from "obsidian";
import type { ConstellaController } from "../core/ConstellaController";
import { compareConnections, relatedNotes } from "../graph/WorkspaceInsights";

export class WorkspaceToolsModal extends Modal {
  private tab = "Related";
  private route: string[] = [];
  private index = -1;
  private routeName = "Presentation";
  private addPath = "";
  private left = "";
  private right = "";
  private revision = 0;

  constructor(private readonly controller: ConstellaController) { super(controller.app); }

  onOpen(): void { this.render(); }
  onClose(): void { this.revision++; this.contentEl.empty(); }

  private action(parent: HTMLElement, label: string, callback: () => void | Promise<void>, disabled = false): void {
    const button = parent.createEl("button", { text: label });
    button.disabled = disabled;
    button.addEventListener("click", () => { void Promise.resolve().then(callback).catch(() => new Notice("The action could not be completed. Please try again.")); });
  }

  private focus(path: string): void {
    const node = this.controller.currentGraph.nodes.find(item => item.path === path);
    if (!node) { new Notice("This note is missing or excluded by the current graph filters."); return; }
    this.controller.pause();
    this.controller.selectNode(node);
  }

  private render(): void {
    this.revision++;
    const root = this.contentEl;
    root.empty();
    new Setting(root).setName("Workspace tools").setHeading();
    const tabs = root.createDiv({ cls: "constella-panel-tabs" });
    for (const name of ["Related", "Bookmarks", "Presentation", "Compare", "Changes"]) {
      const button = tabs.createEl("button", { text: name, attr: { "aria-pressed": String(this.tab === name) } });
      button.toggleClass("is-active", this.tab === name);
      button.addEventListener("click", () => { this.tab = name; this.render(); });
    }
    if (this.tab === "Related") this.related(root);
    if (this.tab === "Bookmarks") this.bookmarks(root);
    if (this.tab === "Presentation") this.presentation(root);
    if (this.tab === "Compare") this.compare(root);
    if (this.tab === "Changes") this.changes(root);
  }

  private related(root: HTMLElement): void {
    const selected = this.controller.currentNode;
    if (!selected) { root.createDiv({ text: "Select a graph note first." }); return; }
    root.createDiv({ text: selected.title });
    const results = relatedNotes(this.controller.currentGraph, selected, node => {
      const cache = this.app.metadataCache.getFileCache(node.file);
      return cache ? [...new Set(getAllTags(cache) ?? [])] : [];
    });
    if (!results.length) root.createDiv({ text: "No related notes found in the current graph." });
    for (const result of results) {
      const row = new Setting(root).setName(result.node.title).setDesc(result.reasons.join(" · "));
      row.addButton(button => button.setButtonText("Focus").onClick(() => { this.focus(result.node.path); this.render(); }));
    }
  }

  private bookmarks(root: HTMLElement): void {
    const current = this.controller.currentNode;
    if (current) this.action(root, this.controller.workspaceTools.bookmarks.includes(current.path) ? "Remove selected bookmark" : "Bookmark selected note", async () => { await this.controller.toggleBookmark(current.path); this.render(); });
    if (!this.controller.workspaceTools.bookmarks.length) root.createDiv({ text: "No bookmarks yet." });
    for (const path of this.controller.workspaceTools.bookmarks) {
      new Setting(root).setName(path).addButton(button => button.setButtonText("Focus").onClick(() => this.focus(path)))
        .addButton(button => button.setButtonText("Remove").onClick(() => { void this.controller.toggleBookmark(path).then(() => this.render()).catch(() => new Notice("Could not save bookmarks.")); }));
    }
  }

  private presentation(root: HTMLElement): void {
    new Setting(root).setName("Route name").addText(text => text.setValue(this.routeName).onChange(value => { this.routeName = value; }));
    new Setting(root).setName("Add a note").addDropdown(dropdown => {
      dropdown.addOption("", "Select note");
      for (const node of [...this.controller.currentGraph.nodes].sort((a, b) => a.path.localeCompare(b.path))) {
        dropdown.addOption(node.path, node.path);
      }
      dropdown.setValue(this.addPath).onChange(path => { this.addPath = path; this.render(); });
    }).addButton(button => button.setButtonText("Add").setDisabled(!this.addPath).onClick(() => { this.route.push(this.addPath); this.render(); }));
    const current = this.controller.currentNode;
    this.action(root, "Add selected note", () => { if (current) { this.route.push(current.path); this.render(); } }, !current);
    this.action(root, "Save route", async () => { await this.controller.savePresentation(this.routeName.trim() || "Presentation", this.route); this.render(); }, !this.route.length);
    this.action(root, "Start presentation", () => {
      const available = new Set(this.controller.currentGraph.nodes.map(node => node.path));
      const missing = this.route.filter(path => !available.has(path)).length;
      if (missing) new Notice(`${missing} missing or filtered route notes will be skipped.`);
      if (this.controller.startPresentation(this.route)) this.close();
      else new Notice("No route notes are available in the current graph.");
    }, !this.route.length);
    this.action(root, "Clear route", () => { this.route = []; this.index = -1; this.render(); });
    const move = (delta: number) => {
      this.index = Math.max(0, Math.min(this.route.length - 1, this.index + delta));
      this.focus(this.route[this.index]); this.render();
    };
    this.action(root, "Previous", () => move(-1), this.index <= 0);
    this.action(root, "Next", () => move(1), !this.route.length || this.index >= this.route.length - 1);
    root.createDiv({ text: `${this.index + 1} / ${this.route.length}` });
    this.route.forEach((path, index) => {
      new Setting(root).setName(`${index + 1}. ${path}`)
        .addButton(button => button.setButtonText("Up").setDisabled(index === 0).onClick(() => { [this.route[index - 1], this.route[index]] = [this.route[index], this.route[index - 1]]; this.index = -1; this.render(); }))
        .addButton(button => button.setButtonText("Remove").onClick(() => { this.route.splice(index, 1); this.index = -1; this.render(); }));
    });
    for (const route of this.controller.workspaceTools.routes) {
      new Setting(root).setName(route.name).setDesc(`${route.paths.length} notes`)
        .addButton(button => button.setButtonText("Load").onClick(() => { this.routeName = route.name; this.route = [...route.paths]; this.index = -1; this.render(); }))
        .addButton(button => button.setButtonText("Delete").onClick(() => { void this.controller.deletePresentation(route.name).then(() => this.render()).catch(() => new Notice("Could not delete route.")); }));
    }
  }

  private compare(root: HTMLElement): void {
    const nodes = [...this.controller.currentGraph.nodes].sort((a, b) => a.path.localeCompare(b.path));
    for (const side of ["left", "right"] as const) {
      new Setting(root).setName(side === "left" ? "First note" : "Second note").addDropdown(dropdown => {
        dropdown.addOption("", "Select note");
        for (const node of nodes) {
          dropdown.addOption(node.id, node.path);
        }
        dropdown.setValue(this[side]).onChange(value => { this[side] = value; this.render(); });
      });
    }
    const a = nodes.find(node => node.id === this.left), b = nodes.find(node => node.id === this.right);
    if (!a || !b || a.id === b.id) { root.createDiv({ text: "Choose two different notes." }); return; }
    const connections = compareConnections(this.controller.currentGraph, a.id, b.id);
    for (const [label, ids] of Object.entries(connections)) {
      new Setting(root).setName(label === "shared" ? "Shared connections" : label === "leftOnly" ? "Only first note" : "Only second note").setHeading();
      root.createDiv({ text: ids.map(id => nodes.find(node => node.id === id)?.title ?? id).join(", ") || "None" });
    }
    const columns = root.createDiv({ cls: "constella-compare-columns" });
    const revision = this.revision;
    for (const node of [a, b]) {
      const column = columns.createDiv();
      column.createDiv({ text: node.title });
      const text = column.createEl("pre", { cls: "constella-compare-text", text: "Loading…" });
      void this.app.vault.cachedRead(node.file).then(value => { if (revision === this.revision) text.textContent = value || "Empty note."; }).catch(() => { if (revision === this.revision) text.textContent = "Could not read this note."; });
    }
  }

  private changes(root: HTMLElement): void {
    const previous = this.controller.workspaceTools.snapshot;
    if (!previous) root.createDiv({ text: "Create a baseline to track changes on your next visit." });
    else {
      const current = this.controller.vaultSnapshot();
      const added = Object.keys(current.notes).filter(path => previous.notes[path] === undefined);
      const modified = Object.keys(current.notes).filter(path => previous.notes[path] !== undefined && previous.notes[path] !== current.notes[path]);
      const removed = Object.keys(previous.notes).filter(path => current.notes[path] === undefined);
      const oldEdges = new Set(previous.edges), newEdges = new Set(current.edges);
      for (const [label, paths] of [["Added notes", added], ["Modified notes", modified], ["Removed notes", removed]] as const) {
        new Setting(root).setName(`${label} (${paths.length})`).setHeading();
        for (const path of paths) this.action(root, path, () => this.focus(path), label === "Removed notes");
      }
      for (const [label, edges] of [["Added links", current.edges.filter(edge => !oldEdges.has(edge))], ["Removed links", previous.edges.filter(edge => !newEdges.has(edge))]] as const) {
        new Setting(root).setName(`${label} (${edges.length})`).setHeading();
        for (const edge of edges) root.createDiv({ text: (JSON.parse(edge) as string[]).join(" → ") });
      }
    }
    this.action(root, previous ? "Mark changes as seen" : "Create baseline", async () => { await this.controller.markGraphChangesSeen(); this.render(); });
  }
}
