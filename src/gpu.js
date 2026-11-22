// The WebGPU runner, in a file of its own: render() loads it only when a layout is going to run
// on the GPU, so pages that never do don't pay for it (bundlers split it off; the script-tag
// build has it inside).
export {createWebGPUBackend, runOnGpu} from 'ngraph.forcelayout/modules/gpu/index.js';
