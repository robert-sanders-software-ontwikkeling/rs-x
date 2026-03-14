export const ZOOM_PRESETS = [10, 25, 50, 75, 100, 125, 150, 200, 250, 300];

export function snapZoomPercentToPreset(value: number): number {
  let best = ZOOM_PRESETS[0];
  let bestDistance = Math.abs(value - best);

  for (const preset of ZOOM_PRESETS) {
    const distance = Math.abs(value - preset);
    if (distance < bestDistance) {
      best = preset;
      bestDistance = distance;
    }
  }

  return best;
}
