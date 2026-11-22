// VivaGraph: draws graphs in the browser.
//
//   import {render, createGraph} from 'vivagraphjs';
//
//   const graph = createGraph();
//   graph.addLink('Alice', 'Bob');
//   render(graph);
//
// render() is the whole library. The rest of the exports are the parts it is made of, for pages
// that want to put them together themselves.
export {default as render, GPU_MIN_NODES} from './render.js';
export {hasNames} from './names.js';
export {stepsForFrame, hasHardwareWebGPU} from './device.js';
export {
  createGraph, createLayout, createScene, createView, placeNodes,
  styleNodes, fitLayout, labelNodes, hoverNodes, dragNodes, selectNodes, inspectNodes,
  navigateNodes, searchNodes, pulseNodes, PALETTE
} from './deps.js';

export {default as version} from './version.js';
