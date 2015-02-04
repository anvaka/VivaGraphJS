var gulp = require('gulp');
var gutil = require('gulp-util');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');

var path = require('path');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var del = require('del');
var run = require('gulp-run');

gulp.task('clean', clean);
gulp.task('build', build);
gulp.task('test', test);
gulp.task('release', ['clean', 'build'], test);
gulp.task('default', watch);

function watch() {
  gulp.watch('src/**/*.js', ['build']);
}

function clean(cb) {
  del(['dist'], cb);
}

function test() {
  new run.Command('npm test').exec();
}

function build() {
  var bundler = require('browserify')('./src/viva.js', {
    standalone: 'Viva'
  });
  var bundle = bundler.bundle()
    .on('error', showError);

  bundle.pipe(source('vivagraph.js'))
    .pipe(buffer())
    .pipe(gulp.dest('./dist/'))
    .pipe(rename('vivagraph.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/'));

  function showError(err) {
    gutil.log(gutil.colors.red('Failed to browserify'), gutil.colors.yellow(err.message));
  }
}

function getFiles() {
  // todo: this will be changed when we move to commonjs
  return [ // core
    "Utils/etc.js",
    "Utils/browserInfo.js",
    "Utils/indexOf.js",
    "Utils/getDimensions.js",
    "Utils/events.js",
    "Input/spatialIndex.js", // TODO: Do I need this for SVG?
    "Utils/timer.js",
    "Utils/geom.js",

    "Core/primitives.js",
    "Core/graph.js",
    "Core/operations.js",

    "Physics/primitives.js",
    "Physics/eulerIntegrator.js",
    "Physics/Forces/nbodyForce.js",
    "Physics/Forces/dragForce.js",
    "Physics/Forces/springForce.js",
    "Physics/forceSimulator.js",
    "Layout/forceDirected.js",
    "Layout/constant.js",
    "View/renderer.js",
    // extra
    "Core/serializer.js",
    "Algorithms/centrality.js",
    "Algorithms/Community/community.js",
    "Algorithms/Community/slpa.js",
    "Core/generator.js",
    // svg
    "View/svgGraphics.js",
    "View/svgNodeFactory.js",
    // webgl
    "WebGL/webgl.js",
    "WebGL/webglUIModels.js",
    "WebGL/webglNodeProgram.js",
    "WebGL/webglLinkProgram.js",
    "WebGL/webglImageNodeProgram.js",
    "View/webglGraphics.js",
    "WebGL/webglInputEvents.js",
    "Input/webglInputManager.js"].map(toSrcFolder);
}

function toSrcFolder(name) {
  return path.join('src', name);
}
