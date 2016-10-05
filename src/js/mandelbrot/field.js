
goog.provide('mandelbrot.Field');

goog.require('ComplexNumber');


// FILE SCOPE START
(function() {


/**
 * @param {number} w
 * @param {number} h
 * @param {ComplexNumber} tl
 * @param {number} delta
 * @constructor
 */
var Field = mandelbrot.Field = function(w, h, tl, delta) {
  this.w = w;
  this.h = h;
  this.tl = tl;
  this.delta = delta;
  this.numValues = w * h;
  this.dataLength = this.numValues * 2;
  this.data = new Float64Array(this.dataLength);
  this.meta = new Uint16Array(this.numValues);
  this.iteration = 0;
};


/**
 * @enum {number}
 */
Field.Mask = {
  DIVERGING: 1 << 15,
  NUM_ITERATIONS: (1 << 15) - 1,
};


Field.prototype.TPL = function() {

  // for (var y = 0; y < this.h; y++) {
  //   for (var x = 0; x < this.w; x++) {

  //   }
  // }

  for (var y = 0, c = this.tl.copy(), rowStartIdx;
       c.r = this.tl.r, rowStartIdx = y * this.w, y < this.h;
       y++, c.i -= this.delta) {
    for (var x = 0, idx;
         idx = rowStartIdx + x, x < this.w;
         x++, c.r += this.delta) {
      console.log(x, y, c);
    }
  }

};


/**
 * @param {number=} n
 */
Field.prototype.iterate = function(n) {
  n = n || 1;
  var z = new ComplexNumber;
  for (var y = 0, c = this.tl.copy(), rowStartIdx;
       c.r = this.tl.r, rowStartIdx = y * this.w, y < this.h;
       y++, c.i -= this.delta) {

    for (var x = 0, idx;
         idx = rowStartIdx + x, x < this.w;
         x++, c.r += this.delta) {
      var diverging = this.meta[idx] & Field.Mask.DIVERGING;
      if (diverging) continue;

      z.r = this.data[idx * 2];
      z.i = this.data[idx * 2 + 1];

      for (var i = 0; i < n; i++) {
        z.square().add(c);

        if (z.abs() > 3) {
          diverging = Field.Mask.DIVERGING;
          i++;
          break;
        }
      }
      var numIter = this.meta[idx] & Field.Mask.NUM_ITERATIONS;
      this.meta[idx] = diverging | (numIter + i);

      this.data[idx * 2] = z.r;
      this.data[idx * 2 + 1] = z.i;
    }
  }
  this.iteration += n;
};






// FILE SCOPE END
})();
