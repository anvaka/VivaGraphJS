// What the device can do, and how much layout work a frame may carry on it.

// Most steps a frame runs when steps per frame are automatic
export const MAX_AUTO_STEPS = 10;

/**
 * Milliseconds of layout work per frame. A handheld device (the main pointer is a finger, and
 * nothing hovers) gets half of a desktop's: its CPU is slower, its battery smaller, and its
 * frame has to draw too.
 */
export function frameBudgetOf(win = globalThis) {
  let media = query => !!(win.matchMedia && win.matchMedia(query).matches);
  let handheld = media('(pointer: coarse)') && !media('(hover: hover)');
  return handheld ? 4 : 8;
}

/**
 * Whether WebGPU is worth using here. `navigator.gpu` can be there without a usable GPU: no
 * adapter (a blocklisted driver, WebGPU turned off), or a software one, which runs a layout
 * slower than the CPU does.
 */
export async function hasHardwareWebGPU(nav = globalThis.navigator) {
  if (!nav || !nav.gpu) return false;
  try {
    let adapter = await nav.gpu.requestAdapter({powerPreference: 'high-performance'});
    if (!adapter) return false;
    let software = adapter.info ? adapter.info.isFallbackAdapter : adapter.isFallbackAdapter;
    return !software;
  } catch (e) {
    return false;
  }
}

/**
 * Steps for the next frame: `stepsPerFrame` when it is a positive number; for 0 ("auto") as many
 * as fit into `frameBudget` ms at the measured `msPerStep`, between 1 and MAX_AUTO_STEPS (one
 * step while nothing is measured yet).
 */
export function stepsForFrame(stepsPerFrame, msPerStep, frameBudget) {
  if (stepsPerFrame > 0) return stepsPerFrame;
  if (!(msPerStep > 0)) return 1;
  return Math.max(1, Math.min(MAX_AUTO_STEPS, Math.floor(frameBudget / msPerStep)));
}
