let gulp = require('gulp');
let buffer = require('vinyl-buffer');
let source = require('vinyl-source-stream');

let uglify = require('gulp-uglify');
let rename = require('gulp-rename');
let del = require('del');
let run = require('gulp-run');

gulp.task('clean', clean);
gulp.task('build', build);
gulp.task('test', test);
gulp.task('release', gulp.series('clean', 'build', test));
gulp.task('default', watch);

function watch() {
  gulp.watch('src/**/*.js', ['build']);
}

function clean(cb) {
  del(['dist'], cb);
}

function test(cb) {
  new run.Command('npm test').exec('', cb);
}

function build(cb) {
  let bundler = require('browserify')('./src/viva.js', {
    standalone: 'Viva'
  });
  let bundle = bundler.bundle()
    .on('error', showError);

  bundle.pipe(source('vivagraph.js'))
    .pipe(buffer())
    .pipe(gulp.dest('./dist/'))
    .pipe(rename('vivagraph.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/'));

  bundle.on('end', cb);

  function showError(err) {
    console.log('Failed to browserify', err.message);
  }
}
