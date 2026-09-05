import { PluginSettingTab, Setting } from "obsidian";
import type ConstellaPlugin from "../main";

export class ConstellaSettingsTab extends PluginSettingTab {
  constructor(private readonly plugin: ConstellaPlugin) {
    super(plugin.app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Constella" });
    containerEl.createEl("p", {
      text: "Structural preferences live here. Visual exploration controls are available inside the Constella view."
    });

    new Setting(containerEl)
      .setName("Performance profile")
      .setDesc("Auto is conservative and adapts later phases to vault size and frame rate.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("auto", "Auto")
          .addOption("high-quality", "High Quality")
          .addOption("balanced", "Balanced")
          .addOption("large-vault", "Large Vault")
          .addOption("low-power", "Low Power")
          .addOption("custom", "Custom")
          .setValue(this.plugin.settings.performanceProfile)
          .onChange(async (value) => {
            this.plugin.settings.performanceProfile = value as typeof this.plugin.settings.performanceProfile;
            await this.plugin.saveConstellaSettings();
          })
      );

    new Setting(containerEl)
      .setName("Debug mode")
      .setDesc("Shows extra runtime information in future debug panels.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.debug).onChange(async (value) => {
          this.plugin.settings.debug = value;
          await this.plugin.saveConstellaSettings();
        })
      );

    new Setting(containerEl)
      .setName("Show first-run experience")
      .setDesc("Reserved for the onboarding flow in a later phase.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showFirstRun).onChange(async (value) => {
          this.plugin.settings.showFirstRun = value;
          await this.plugin.saveConstellaSettings();
        })
      );
  }
}

