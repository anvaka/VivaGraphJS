var gulp = require('gulp');
var gutil = require('gulp-util');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');

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
