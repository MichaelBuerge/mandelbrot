
goog.provide('mandelbrot.WebglView');

goog.require('goog.log');
goog.require('goog.Promise');
goog.require('webgl');

/**
 * @param {Element} canvasElem
 * @constructor
 */
mandelbrot.WebglView = function(canvasElem) {
  this.canvasElem = canvasElem;

  this.cutout = new mandelbrot.Cutout();

  this.visualizationOpts = {
    greyScale: {
      logarithmic: 1,
      periodic: false,
      period: 100,
      periodAnchor: 0,
      smooth: false,
    }
  }

  this.glInit_();

  goog.Promise.all([
    // iter program
    webgl.loadShaders('js/mandelbrot/vert.glsl', 'js/mandelbrot/frag_iter.glsl')
      .then(function(res) {
        /** @private @type {WebGLProgram} */
        this.progIter_ = webgl.createProgram(this.gl_, res.vert, res.frag);
      }.bind(this)),
    // copy program
    webgl.loadShaders('js/mandelbrot/vert.glsl', 'js/mandelbrot/frag_copy.glsl')
      .then(function(res) {
        /** @private @type {WebGLProgram} */
        this.progCopy_ = webgl.createProgram(this.gl_, res.vert, res.frag);
      }.bind(this)),
    // draw program
    webgl.loadShaders('js/mandelbrot/vert.glsl', 'js/mandelbrot/frag_draw.glsl')
      .then(function(res) {
        /** @private @type {WebGLProgram} */
        this.progDraw_ = webgl.createProgram(this.gl_, res.vert, res.frag);
      }.bind(this)),
  ])
  .then(this.setup_.bind(this));
};


/** @type {goog.debug.Logger} */
mandelbrot.WebglView.logger = mandelbrot.WebglView.prototype.logger =
    goog.log.getLogger('mandelbrot.WebglView');


/** @private @type {boolean} */
mandelbrot.WebglView.prototype.initialized_ = false;


/** @type {number} */
mandelbrot.WebglView.prototype.iterationsPerUpdate = 1;


/** @type {number} */
mandelbrot.WebglView.prototype.catchUpSpeedUp = 100;


/** @enum {number} */
mandelbrot.WebglView.Visualization = {
  BACK_AND_WHITE: 1,
  GREY_SCALE: 2,
};


/** @type {mandelbrot.WebglView.Visualization} */
mandelbrot.WebglView.prototype.visualization = 2;



/**
 * Updates the size (measuring the canvas element size).
 */
mandelbrot.WebglView.prototype.updateSize = function() {
  var rect = this.canvasElem.getBoundingClientRect();

  var devicePixelRatio = window.devicePixelRatio;

  this.size = {
    w: rect.width * devicePixelRatio,
    h: rect.height * devicePixelRatio,
  };

  this.canvasElem.width = this.size.w;
  this.canvasElem.height = this.size.h;

  this.cutout.setPixelSize(this.size);

  if (this.initialized_) {
    this.gl_.viewport(0, 0, this.size.w, this.size.h);
    this.gl_.uniform2f(this.uniformsDraw_.fbSize, this.size.w, this.size.h);

    var w = this.size.w,
        h = this.size.h;

    this.createFieldData_(w, h);

    this.reset();
  }
};


/**
 * @parma {WebGLRenderingContext} gl
 * @param {number} w
 * @param {number} h
 * @return {{buf:ArrayBuffer, arr:ArrayBufferView, tex:WebGLTexture}}
 */
mandelbrot.WebglView.prototype.createFieldData_ = function(w, h) {
  /**
   * @type {webgl.TexturePair}
   * @private
   */
  this.fieldData_ = new webgl.TexturePair(this.gl_, w, h);
};


mandelbrot.WebglView.prototype.moveBy = function(dx, dy) {
  var center = this.cutout.center;
  center.r += dx * this.cutout.delta;
  center.i -= dy * this.cutout.delta;
  this.cutout.setCenter(center);

  this.copy_(dx, dy);
};


/* -------------------------------------------------------------------------- */


/**
 * @private
 */
mandelbrot.WebglView.prototype.glInit_ = function() {
  /**
   * @type {WebGLRenderingContext}
   * @private
   */
  var gl = this.gl_ = webgl.getContext(this.canvasElem);
  if (gl) this.logger.info('WebGL context created.')
  else throw new Error('Error creating WebGL context.');

  if (!gl.getExtension('OES_texture_float')) {
    alert('No support for OES_texture_float in your browser :-(');
    throw new Error('OES_texture_float extension not available.');
  }

  this.offscreenFramebuffer_ = gl.createFramebuffer();
};



mandelbrot.WebglView.prototype.setup_ = function() {
  var gl = this.gl_;

  gl.clearColor(0, 0, 0, 1);
  gl.clear(this.gl_.COLOR_BUFFER_BIT);

  /** @private  @type {WebGLBuffer} */
  this.screenQuad_ = webgl.screenQuad(gl);

  // ----- iter program -----

  gl.useProgram(this.progIter_);

  var attribLoc = gl.getAttribLocation(this.progIter_, 'vertex');
  gl.enableVertexAttribArray(attribLoc);
  gl.vertexAttribPointer(
      attribLoc, this.screenQuad_.itemSize, gl.FLOAT, false, 0, 0);

  var get = gl.getUniformLocation.bind(gl, this.progIter_);
  /**
   * @type {Object.<WebGLUniformLocation>}
   * @private
   */
  this.uniformsIter_ = {
    // NOTE: The same uniform name can't be used both in the vertex-
    // and fragement-shader.
    size: get('size'),
    tl: get('tl'),
    delta: get('delta'),
    iterationsPerUpdate: get('iterationsPerUpdate'),
    targetIterations: get('targetIterations'),
    catchUpSpeedUp: get('catchUpSpeedUp'),
    field: get('field'),
  };

  // ----- copy program -----

  gl.useProgram(this.progCopy_);

  var attribLoc = gl.getAttribLocation(this.progIter_, 'vertex');
  gl.enableVertexAttribArray(attribLoc);
  gl.vertexAttribPointer(
      attribLoc, this.screenQuad_.itemSize, gl.FLOAT, false, 0, 0);

  var get = gl.getUniformLocation.bind(gl, this.progCopy_);
  /**
   * @type {Object.<WebGLUniformLocation>}
   * @private
   */
  this.uniformsCopy_ = {
    // NOTE: The same uniform name can't be used both in the vertex-
    // and fragement-shader.
    size: get('size'),
    field: get('field'),
    offset: get('offset'),
  };

  // ----- draw program -----

  gl.useProgram(this.progDraw_);

  var attribLoc = gl.getAttribLocation(this.progDraw_, 'vertex');
  gl.enableVertexAttribArray(attribLoc);
  gl.vertexAttribPointer(
      attribLoc, this.screenQuad_.itemSize, gl.FLOAT, false, 0, 0);


  var get = gl.getUniformLocation.bind(gl, this.progDraw_);
  /**
   * @type {Object.<WebGLUniformLocation>}
   * @private
   */
  this.uniformsDraw_ = {
    // NOTE: The same uniform name can't be used both in the vertex-
    // and fragement-shader.
    size: get('size'),
    display: get('display'),
    field: get('field'),
    iterations: get('iterations'),
    visualization: get('visualization'),
    logarithmic: get('logarithmic'),
    periodic: get('periodic'),
    period: get('period'),
    periodAnchor: get('periodAnchor'),
    smooth: get('smooth'),
  };

  // ------ finish ------

  this.initialized_ = true;

  this.updateSize();
  this.reset();

  this.iterateAndDraw();
};


/**
 * Reset the image..
 */
mandelbrot.WebglView.prototype.reset = function() {
  if (!this.initialized_) return;

  var gl = this.gl_;
  var w = this.size.w,
      h = this.size.h;

  gl.bindTexture(gl.TEXTURE_2D, this.fieldData_.front);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                w, h,
                0, gl.RGBA, gl.FLOAT, null);

  this.iterations = 0;
};


/**
 * Performs iteration(s) and draws.
 */
mandelbrot.WebglView.prototype.iterateAndDraw = function() {
  if (!this.initialized_) return;

  //this.field.iterate(this.iterationsPerUpdate);
  //this.uploadFieldData_();

  this.iterate_();
  // this.copy_();
  this.draw_();
};


mandelbrot.WebglView.prototype.iterate_ = function() {
  var gl = this.gl_;
  var w = this.size.w;
  var h = this.size.h;

  gl.useProgram(this.progIter_);

  this.iterations += this.iterationsPerUpdate;

  // Texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, this.fieldData_.front);

  // Bind framebuffer.
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.offscreenFramebuffer_);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                          gl.TEXTURE_2D, this.fieldData_.back, 0);  

  // Uniforms
  var uni = this.uniformsIter_;
  gl.uniform2f(uni.size, w, h);
  gl.uniform2f(uni.tl, this.cutout.tl.r, this.cutout.tl.i);
  gl.uniform1f(uni.delta, this.cutout.delta);
  gl.uniform1i(uni.iterationsPerUpdate, this.iterationsPerUpdate);
  gl.uniform1i(uni.targetIterations, this.iterations);
  gl.uniform1i(uni.catchUpSpeedUp, 5);
  gl.uniform1i(uni.field, 0);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.screenQuad_.numItems);

  // Swap
  this.fieldData_.swap();
};


/**
 *
 */
mandelbrot.WebglView.prototype.copy_ = function(offsetX, offsetY) {
  var gl = this.gl_;
  var w = this.size.w;
  var h = this.size.h;

  gl.useProgram(this.progCopy_);

  // Input texture.
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, this.fieldData_.front);

  // Output texture.
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.offscreenFramebuffer_);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                          gl.TEXTURE_2D, this.fieldData_.back, 0);

  // Uniforms.
  var uni = this.uniformsCopy_;
  gl.uniform2f(uni.size, w, h);
  gl.uniform1i(uni.field, 0);
  gl.uniform2f(uni.offset, offsetX || 0, offsetY || 0);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.screenQuad_.numItems);

  this.fieldData_.swap();
};


/**
 * @private
 */
mandelbrot.WebglView.prototype.draw_ = function() {
  var gl = this.gl_;
  var w = this.size.w;
  var h = this.size.h;

  gl.useProgram(this.progDraw_);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, this.fieldData_.front);

  // Uniforms.
  var uni = this.uniformsDraw_;
  gl.uniform2f(uni.size, w, h);
  gl.uniform1i(uni.field, 0);
  gl.uniform1i(uni.iterations, this.iterations);
  gl.uniform1i(uni.visualization, this.visualization);
  if (this.visualization == mandelbrot.WebglView.Visualization.GREY_SCALE) {
    var opts = this.visualizationOpts.greyScale;
    gl.uniform1i(uni.logarithmic, opts.logarithmic);
    gl.uniform1i(uni.periodic, opts.periodic ? 1 : 0);
    gl.uniform1i(uni.period, opts.period);
    gl.uniform1i(uni.periodAnchor, opts.periodAnchor);
    gl.uniform1i(uni.smooth, opts.smooth ? 1 : 0);
  }

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.screenQuad_.numItems);
};






