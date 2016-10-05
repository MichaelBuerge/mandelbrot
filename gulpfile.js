

var gulp = require('gulp');
var closureDeps = require('gulp-closure-deps');
var inlineResource = require('gulp-js-inline-resource')


gulp.task('deps', function() {
  var jsSrcFiles = [
    'src/**/*.js',
    'node_modules/orino-anim/src/**/*.js',
  ];
  gulp.src(jsSrcFiles)
    .pipe(closureDeps({
      fileName: 'deps.js',
      prefix: '../../../..',
    }))
    .pipe(gulp.dest('src'));

});


gulp.task('shaders', function() {
  gulp.src(['src/js/mandelbrot/shaders/*.glsl'])
    .pipe(inlineResource.multiple({
        closureProvideSymbol: 'mandelbrot.shaders',
        fileName: 'shaders.gen.js',
      }))
    .pipe(gulp.dest('src/js/mandelbrot/shaders'));
});


gulp.task('watch', function() {
  gulp.watch('src/js/mandelbrot/*.glsl', ['shaders']);
});



