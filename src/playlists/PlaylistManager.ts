import type { ActiveConfiguration, Playlist, PlaylistStep } from "../core/types";

export class PlaylistManager {
  createBuiltIns(): Playlist[] {
    const now = Date.now();
    return [
      {
        id: "playlist-evening-flow",
        schemaVersion: 1,
        name: "Evening Flow",
        builtIn: true,
        favorite: true,
        repeat: true,
        shuffle: false,
        createdAt: now,
        updatedAt: now,
        steps: [
          this.step("wander", "deep-space", "deep-ocean", "floating", 120, "smooth-camera"),
          this.step("path-journey", "constellation", "aurora", "cinematic", 180, "color-morph"),
          this.step("forgotten-knowledge", "soft-glow", "rainbow-flow", "calm", 240, "crossfade")
        ]
      }
    ];
  }

  ensureBuiltIns(playlists: Playlist[]): Playlist[] {
    const byId = new Map(playlists.map((playlist) => [playlist.id, playlist]));
    this.createBuiltIns().forEach((playlist) => {
      if (!byId.has(playlist.id)) {
        byId.set(playlist.id, playlist);
      }
    });
    return [...byId.values()];
  }

  createFromConfiguration(playlists: Playlist[], name: string, config: ActiveConfiguration): Playlist[] {
    const now = Date.now();
    return [
      ...playlists,
      {
        id: `playlist-${now}-${Math.random().toString(36).slice(2, 8)}`,
        schemaVersion: 1,
        name,
        builtIn: false,
        favorite: false,
        repeat: true,
        shuffle: false,
        createdAt: now,
        updatedAt: now,
        steps: [this.step(config.mode, config.visual, config.colors, config.camera, 180, "smooth-camera")]
      }
    ];
  }

  private step(
    mode: PlaylistStep["mode"],
    visual: PlaylistStep["visual"],
    colors: PlaylistStep["colors"],
    camera: PlaylistStep["camera"],
    durationSeconds: number,
    transition: PlaylistStep["transition"]
  ): PlaylistStep {
    return {
      id: `step-${Math.random().toString(36).slice(2, 10)}`,
      mode,
      visual,
      colors,
      camera,
      durationSeconds,
      transition
    };
  }
}

