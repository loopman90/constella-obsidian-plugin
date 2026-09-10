import { setIcon } from "obsidian";

export function sliderControl(label: string, value: number, defaultValue: number, onChange: (value: number) => void | Promise<void>): HTMLElement {
  const row = createDiv({ cls: "constella-panel-control" });
  row.createSpan({ text: label });
  const controls = row.createDiv({ cls: "constella-slider-inputs" });
  const range = controls.createEl("input", { type: "range", attr: { min: "0", max: "1", step: "0.01", "aria-label": label } });
  const number = controls.createEl("input", { type: "number", attr: { min: "0", max: "1", step: "0.01", "aria-label": `${label} value` } });
  range.value = number.value = String(value);
  range.addEventListener("input", () => { number.value = range.value; });
  const commit = (input: HTMLInputElement): void => {
    if (!input.value.trim() || !Number.isFinite(input.valueAsNumber)) {
      input.value = range.value;
      return;
    }
    const next = Math.round(Math.max(0, Math.min(1, input.valueAsNumber)) * 100) / 100;
    range.value = number.value = String(next);
    void onChange(next);
  };
  range.addEventListener("change", () => commit(range));
  number.addEventListener("change", () => commit(number));
  const reset = controls.createEl("button", { cls: "clickable-icon constella-icon-button", attr: { title: `Reset ${label} to ${defaultValue}`, "aria-label": `Reset ${label}` } });
  setIcon(reset, "rotate-ccw");
  reset.addEventListener("click", () => { range.value = number.value = String(defaultValue); void onChange(defaultValue); });
  return row;
}
