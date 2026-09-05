export class DisplayModeController {
  private previousCursor = "";

  async enter(root: HTMLElement, hideUi: boolean): Promise<void> {
    root.toggleClass("constella-display-mode", true);
    root.toggleClass("constella-hide-ui", hideUi);
    this.previousCursor = document.body.style.cursor;
    if (!document.fullscreenElement && document.body.requestFullscreen) {
      await document.body.requestFullscreen();
    }
  }

  async exit(root: HTMLElement): Promise<void> {
    root.toggleClass("constella-display-mode", false);
    root.toggleClass("constella-hide-ui", false);
    document.body.style.cursor = this.previousCursor;
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  }
}

