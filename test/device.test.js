import test from 'node:test';
import assert from 'node:assert/strict';
import {stepsForFrame, frameBudgetOf, hasHardwareWebGPU, MAX_AUTO_STEPS} from '../src/device.js';

test('a fixed number of steps per frame is kept', () => {
  assert.equal(stepsForFrame(3, 100, 8), 3);
});

test('automatic steps fit the frame budget, between 1 and the most allowed', () => {
  assert.equal(stepsForFrame(0, 0, 8), 1, 'nothing measured yet');
  assert.equal(stepsForFrame(0, 2, 8), 4);
  assert.equal(stepsForFrame(0, 50, 8), 1, 'a slow step still runs once');
  assert.equal(stepsForFrame(0, 0.01, 8), MAX_AUTO_STEPS);
});

test('a handheld device gets half the frame budget', () => {
  let device = queries => ({matchMedia: query => ({matches: queries.includes(query)})});
  assert.equal(frameBudgetOf(device(['(hover: hover)'])), 8, 'a desktop');
  assert.equal(frameBudgetOf(device(['(pointer: coarse)'])), 4, 'a phone');
  assert.equal(frameBudgetOf(device(['(pointer: coarse)', '(hover: hover)'])), 8, 'a touch laptop with a mouse');
  assert.equal(frameBudgetOf({}), 8, 'no media queries at all');
});

test('WebGPU counts only with a hardware adapter', async () => {
  let gpu = adapter => ({gpu: {requestAdapter: async () => adapter}});
  assert.equal(await hasHardwareWebGPU({}), false, 'no navigator.gpu');
  assert.equal(await hasHardwareWebGPU(gpu(null)), false, 'no adapter');
  assert.equal(await hasHardwareWebGPU(gpu({info: {isFallbackAdapter: true}})), false, 'a software adapter');
  assert.equal(await hasHardwareWebGPU(gpu({info: {isFallbackAdapter: false}})), true);
  assert.equal(await hasHardwareWebGPU(gpu({isFallbackAdapter: false})), true, 'older browsers: the flag is on the adapter');
  assert.equal(await hasHardwareWebGPU({gpu: {requestAdapter: async () => { throw new Error('blocked'); }}}), false);
});
