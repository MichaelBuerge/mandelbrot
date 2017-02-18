
goog.provide('mandelbrot.WebglView');

goog.require('geom');
goog.require('goog.log');
goog.require('goog.Promise');
goog.require('mandelbrot.Cutout');
goog.require('mandelbrot.shaders');
goog.require('orino.anim');
goog.require('orino.anim.Conductor');
goog.require('orino.anim.Animation');
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
  };

  this.glInit_();

  var shaders = mandelbrot.shaders;
  var vsCode = shaders['viewport.vert.glsl']; 

  /** @private @type {WebGLProgram} */
  this.progIter_ = webgl.createProgram(this.gl_, vsCode, shaders['iter.frag.glsl']);
  /** @private @type {WebGLProgram} */
  this.progCopy_ = webgl.createProgram(this.gl_, vsCode, shaders['copy.frag.glsl']);
  /** @private @type {WebGLProgram} */
  this.progDraw_ = webgl.createProgram(this.gl_, vsCode, shaders['draw.frag.glsl']);

  this.setup_();

  this.conductor = new orino.anim.Conductor;

  this.initEvents_();
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

    this.fieldData_ = new webgl.TexturePair(this.gl_, this.size.w, this.size.h);

    this.reset();
  }
};


mandelbrot.WebglView.prototype.moveBy = function(dx, dy) {
  var center = this.cutout.center;
  center.r += dx * this.cutout.delta;
  center.i -= dy * this.cutout.delta;
  this.cutout.setCenter(center);

  this.copy_(dx, dy);
};


mandelbrot.WebglView.prototype.scale = function(dMagn) {
  this.cutout.setMagnitude(this.cutout.magnitude + dMagn);
  this.reset();
};


mandelbrot.WebglView.prototype.startRenderLoop = function() {
  this.mainAnimation_ = new orino.anim.Animation({
    conductor: this.conductor,
    tick: function() {
      this.iterateAndDraw();
    }.bind(this)
  })
  this.mainAnimation_.start();

};


/** @private */
mandelbrot.WebglView.prototype.initEvents_ = function() {

  // --- Clicking ---

  this.canvasElem.onclick = function(e) {
    if (this.suppressClick_) return;

    var rect = this.canvasElem.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var x = (e.clientX - rect.left) * dpr;
    var y = (e.clientY - rect.top) * dpr;

    var dx = x - rect.width * dpr / 2
    var dy = y - rect.height * dpr / 2;

    this.moveBy(dx, dy);
    // TODO
    //app.setFragment();

  }.bind(this);

  // --- Dragging ---

  this.canvasElem.onmousedown = function(e) {
    var lastX = e.pageX;
    var lastY = e.pageY;
    var moveX = lastX;
    var moveY = lastY;
    var dragging = false;

    this.canvasElem.onmousemove = function(e) {
      moveX = e.pageX;
      moveY = e.pageY;
      dragging = true;
    }

    var dragAnim = new orino.anim.Animation({
      priority: 2,
      tick: function() {
        if (moveX == lastX && moveY == lastY) return;

        var dx = (moveX - lastX) * window.devicePixelRatio;
        var dy = (moveY - lastY) * window.devicePixelRatio;
        this.moveBy(-dx, -dy);
        lastX = moveX;
        lastY = moveY;
      }.bind(this)
    });
    dragAnim.start();

    this.canvasElem.onmouseup = app.canvasElem.onmouseout = function(e) {
      dragAnim.stop();
      this.canvasElem.onmousemove = null;
      this.canvasElem.onmouseup = null;
      this.canvasElem.onmouseout = null;
      if (dragging) {
        this.suppressClick_ = true;
        window.setTimeout(
            function() { this.suppressClick_ = false }.bind(this),
            10);
        // TODO
        //app.setFragment();
      }
    }.bind(this);

  }.bind(this);


  // --- Panning ---

  var view = this;

  this.panner = (function() {
    var components = [];
    var resultant = new geom.Vec2();
    var currentSpeed = 0;
    var targetSpeed = 0;
    var MAX_SPEED = 20;
    var acceleration = 20;

    var panner = new orino.anim.Animation({ priority: 2 });

    panner.UP = new geom.Vec2(0, -1);
    panner.DOWN = new geom.Vec2(0, 1);
    panner.LEFT = new geom.Vec2(-1, 0);
    panner.RIGHT = new geom.Vec2(1, 0);

    panner.addComponent = function(component) {
      if (components.indexOf(component) != -1) return;

      components.push(component);
      targetSpeed = MAX_SPEED;
      this.updateResultant_();
      this.start();
    };

    panner.removeComponent = function(component) {
      var idx = components.indexOf(component);
      if (idx != -1) {
        components.splice(idx, 1);
      }
      if (!components.length) {
        targetSpeed = 0;
        // Not updating the resultant in this case, as it would come out as
        // zero (movement would stop immediately).
      } else {
        this.updateResultant_();        
      }
    };

    panner.updateResultant_ = function() {
      resultant.zero();
      components.forEach(function(comp) {
        resultant.add(comp);
      });
      resultant.normalize();      
    }

    panner.tick = function(state) {
      if (currentSpeed != targetSpeed) {
        var dv = state.elapsed / 1000 * acceleration;
        if (currentSpeed < targetSpeed) {
          currentSpeed = Math.min(currentSpeed + dv, targetSpeed);
        } else {
          currentSpeed = Math.max(currentSpeed - dv, targetSpeed);
        }
      }
      if (currentSpeed == 0) {
        this.stop();
      } else {
        var step = resultant.copy().scale(currentSpeed);
        step.map(Math.round);
        view.moveBy(step.x, step.y);
      }
    };

    return panner;
  })();


  // Keyboard control.

  document.onkeydown = function(e) {
    if (e.repeat) return;

    var kc = e.keyCode;
    if (kc == 67) {  // c
      this.reset();
    } else if (kc == 187) {  // +
      this.scale(1);
    } else if (kc == 189) {  // -
      this.scale(-1);

    } else if (kc == 38) {  // Arrow up
      this.panner.addComponent(this.panner.UP);
    } else if (kc == 40) {  // Arrow down
      this.panner.addComponent(this.panner.DOWN);
    } else if (kc == 37) {  // Arrow left
      this.panner.addComponent(this.panner.LEFT);
    } else if (kc == 39) {  // Arrow right
      this.panner.addComponent(this.panner.RIGHT);
    }
    console.log(kc, e);
  }.bind(this);

  document.onkeyup = function(e) {
    var kc = e.keyCode;
    if (kc == 38) {  // Arrow up
      this.panner.removeComponent(this.panner.UP);
    } else if (kc == 40) {  // Arrow down
      this.panner.removeComponent(this.panner.DOWN);
    } else if (kc == 37) {  // Arrow left
      this.panner.removeComponent(this.panner.LEFT);
    } else if (kc == 39) {  // Arrow right
      this.panner.removeComponent(this.panner.RIGHT);
    }
  }.bind(this);

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






