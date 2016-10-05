
goog.provide('mandelbrot.Canvas2dView');

goog.require('mandelbrot.Cutout');


/**
 * @param {Element} canvasElem
 * @constructor
 */
mandelbrot.Canvas2dView = function(canvasElem) {
  this.canvasElem = canvasElem;

  this.ctx = this.canvasElem.getContext('2d');

  this.cutout = new mandelbrot.Cutout();

  this.updateSize();

  this.canvasElem.onclick = this.handleCanvasClick_.bind(this);
};


/**
 * Updates the size (measuring the canvas element size).
 */
mandelbrot.Canvas2dView.prototype.updateSize = function() {
  var rect = this.canvasElem.getBoundingClientRect();

  var devicePixelRatio = window.devicePixelRatio;

  this.size = {
    w: rect.width * devicePixelRatio,
    h: rect.height * devicePixelRatio,
  };

  this.canvasElem.width = this.size.w;
  this.canvasElem.height = this.size.h;

  this.cutout.setPixelSize(this.size);

  this.reset();
};


/**
 * Reset the image..
 */
mandelbrot.Canvas2dView.prototype.reset = function() {
  this.field = new mandelbrot.Field(
      this.size.w, this.size.h, this.cutout.tl, this.cutout.delta);

  this.imgDataObj = this.ctx.createImageData(this.size.w, this.size.h);
  util.clearImageData(this.imgDataObj, 0, 0, 0, 255);

  this.ctx.putImageData(this.imgDataObj, 0, 0); 
};


/**
 * @param {Event} e
 * @private
 */
mandelbrot.Canvas2dView.prototype.handleCanvasClick_ = function(e) {
  var rect = this.canvasElem.getBoundingClientRect();
  var x = (e.clientX - rect.left) * window.devicePixelRatio;
  var y = (e.clientY - rect.top) * window.devicePixelRatio;

  var center = this.cutout.tl.copy();
  center.r += x * this.cutout.delta;
  center.i -= y * this.cutout.delta;
  this.cutout.setCenter(center);
  this.reset();
};


/** @type {number} */
mandelbrot.Canvas2dView.prototype.iterationsPerUpdate = 3;


/**
 * Performs iteration(s) and draws.
 */
mandelbrot.Canvas2dView.prototype.iterateAndDraw = function() {
  this.field.iterate(this.iterationsPerUpdate);

  for (var idx = 0; idx < this.field.numValues; idx++) {
    if (this.field.meta[idx] & mandelbrot.Field.Mask.DIVERGING) {
      util.imageDataSetPixel(this.imgDataObj, idx, 255, 255, 255, 255);
    }
  }

  this.ctx.putImageData(this.imgDataObj, 0, 0);
};

