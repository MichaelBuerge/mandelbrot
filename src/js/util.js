
goog.provide('util');


/**
 * @param {ImageData} imgDataObj
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} a
 */
util.clearImageData = function(imgDataObj, r, g, b, a) {
  var len = imgDataObj.width * imgDataObj.height;
  for (var idx = 0; idx < len; idx++) {
    util.imageDataSetPixel(imgDataObj, idx, r, g, b, a);
  }
};


/**
 * @param {ImageData} imgDataObj
 * @param {number} idx
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} a
 */
util.imageDataSetPixel = function(imgDataObj, idx, r, g, b, a) {
  util.bufferSetPixel(imgDataObj.data, idx, r, g, b, a);
};


/**
 * @param {ArrayBuffer} buf
 * @param {number} idx
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} a
 */
util.bufferSetPixel = function(buf, idx, r, g, b, a) {
  var idx4 = idx * 4;
  buf[idx4] = r;
  buf[idx4 + 1] = g;
  buf[idx4 + 2] = b;
  buf[idx4 + 3] = a;
}

