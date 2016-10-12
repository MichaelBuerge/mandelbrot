

var gulp = require('gulp');
var glslify = require('glslify');
var closureDeps = require('gulp-closure-deps');
var inlineResource = require('gulp-js-inline-resource')
var stream = require('stream');
var VinylFile = require('vinyl');



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


/**
 * @return {stream.Transform}
 */
function glslifyTransformStream() {
  var transformStream = new stream.Transform({ objectMode: true });
  /**
   * @param {VinylFile} file
   * @param {string=} encoding - ignored if file contains a Buffer
   * @param {function(Error, object)} callback
   */
  transformStream._transform = function(file, encoding, callback) {
    var src = file.contents.toString();
    var glslified = glslify(src, { basedir: file.base });
    // NOTE: Modifiying vinyl file instance (not creating a new one).
    file.contents = new Buffer(glslified, 'utf8');
    this.push(file);
    callback();
  };
  return transformStream;
}


gulp.task('shaders', function() {
  gulp.src(['src/js/mandelbrot/shaders/*.vert.glsl',
            'src/js/mandelbrot/shaders/*.frag.glsl'])
    .pipe(glslifyTransformStream())
    // Write out glslify output.
    // Not actually used, but useful for debugging. Uncomment if needed.
    //.pipe(gulp.dest('src/js/mandelbrot/shaders/build'))
    .pipe(inlineResource.multiple({
        closureProvideSymbol: 'mandelbrot.shaders',
        fileName: 'shaders.gen.js',
      }))
    .pipe(gulp.dest('src/js/mandelbrot/shaders'));
});


gulp.task('watch', function() {
  gulp.watch('src/js/mandelbrot/*.glsl', ['shaders']);
});



