export class IdleDetector {
  private lastActivity = Date.now();
  private timer: number | null = null;
  private readonly markActive = (): void => {
    this.lastActivity = Date.now();
  };

  start(timeoutMs: number, onIdle: () => void): void {
    this.stop();
    window.addEventListener("keydown", this.markActive);
    window.addEventListener("pointerdown", this.markActive);
    window.addEventListener("wheel", this.markActive);
    this.timer = window.setInterval(() => {
      if (Date.now() - this.lastActivity >= timeoutMs) {
        onIdle();
      }
    }, 1000);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    window.removeEventListener("keydown", this.markActive);
    window.removeEventListener("pointerdown", this.markActive);
    window.removeEventListener("wheel", this.markActive);
  }
}
