
goog.provide('mandelbrot.Cutout');

goog.require('ComplexNumber');



/**
 * @param {ComplexNumber=} center
 * @param {number=} magnitude
 * @constructor
 */
mandelbrot.Cutout = function(center, magnitude) {
  this.center = center || new ComplexNumber(-0.5, 0);
  this.magnitude = magnitude || 0;

  this.realExtent = 3 / Math.pow(2, this.magnitude);

  this.tl = new ComplexNumber;
};


mandelbrot.Cutout.prototype.delta = undefined;


/**
 * @param {ComplexNumber} center
 */
mandelbrot.Cutout.prototype.setCenter = function(center) {
  this.center = center;
  this.updateTopLeft_();
};


/**
 * @param {number} magnitude
 */
mandelbrot.Cutout.prototype.setMagnitude = function(magnitude) {
  this.magnitude = magnitude;
  this.realExtent = 3 / Math.pow(2, this.magnitude);
  if (this.pxSize) {
    this.delta = this.realExtent / this.pxSize.w;
    this.updateTopLeft_();
  }
};


/**
 * Reset to default.
 */
mandelbrot.Cutout.prototype.reset = function() {
  this.setCenter(new ComplexNumber(-0.5, 0));
  this.setMagnitude(0);
};


/**
 * Set viewport pixel size.
 * @param {{w:number, h:number}} pxSize
 */
mandelbrot.Cutout.prototype.setPixelSize = function(pxSize) {
  this.pxSize = pxSize;
  this.delta = this.realExtent / this.pxSize.w;
  this.updateTopLeft_();
};


/**
 * @private
 */
mandelbrot.Cutout.prototype.updateTopLeft_ = function() {
  if (!this.pxSize) return;
  this.tl.r = this.center.r - this.pxSize.w / 2 * this.delta;
  this.tl.i = this.center.i + this.pxSize.h / 2 * this.delta;
};

