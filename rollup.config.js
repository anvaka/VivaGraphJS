import {readFileSync} from 'node:fs';
import commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import {minify} from 'terser';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const banner = `/*! VivaGraph ${pkg.version} | ${pkg.license} | https://github.com/anvaka/VivaGraphJS */`;

const plugins = [nodeResolve({browser: true}), commonjs()];

export default [
  // For script tags: one file with everything inside (the layout, the drawing, the WebGPU runner)
  {
    input: 'src/index.js',
    output: [
      {file: 'dist/vivagraph.js', format: 'umd', name: 'Viva', banner, inlineDynamicImports: true},
      {file: 'dist/vivagraph.min.js', format: 'umd', name: 'Viva', banner, inlineDynamicImports: true, plugins: [minifyChunk()]}
    ],
    plugins
  },
  // For bundlers and `<script type="module">`: the WebGPU runner is a second file, loaded only
  // when a layout is going to run on the GPU
  {
    input: 'src/index.js',
    output: {
      dir: 'dist',
      format: 'es',
      banner,
      entryFileNames: 'vivagraph.module.js',
      chunkFileNames: 'vivagraph.[name].js'
    },
    plugins
  }
];

// Names stay unmangled, as in ngraph.forcelayout's own build
function minifyChunk() {
  return {name: 'minify', renderChunk: code => minify(code, {mangle: false, format: {comments: /^!/}})};
}
