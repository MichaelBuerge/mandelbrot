
goog.provide('webgl');

goog.require('goog.net.XhrIo');
goog.require('goog.Promise');


/**
 * @param {HTMLCanvasElement} canvas
 * @return {WebGLRenderingContext}
 */
webgl.getContext = function(canvas) {
  var gl = canvas.getContext('webgl');
  if (!gl) {
    gl = canvas.getContext('experimental-webgl');
  }
  return /** @type{WebGLRenderingContext} */(gl);
};


webgl.loadShader = function(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new goog.net.XhrIo;
    xhr.listen(goog.net.EventType.COMPLETE,
        function() {
          var src = xhr.getResponseText();
          resolve(src);
        });
    xhr.send(url);
  });
}


/**
 * @param {string} vShaderUrl
 * @param {string} fShaderUrl
 * @param {function(string, string)} callback
 * @return {goog.Promise<{vert:string, frag:string}>}
 */
webgl.loadShaders = function(vertShaderUrl, fragShaderUrl, callback) {
  return goog.Promise.all([
      webgl.loadShader(vertShaderUrl),
      webgl.loadShader(fragShaderUrl),
    ])
    .then(function(results) {
      callback && callback(results[0], results[1]);
      return {vert: results[0], frag: results[1]};
    });
};


/**
 * Creates and returns a vertex buffer containing a quad covering the viewport.
 *  2___3
 *  |\  |
 *  | \ |
 *  |__\|
 *  0   1
 * @param {WebGLRenderingContext} gl
 * @return {WebGLBuffer}
 */
webgl.screenQuad = function(gl) {
  var vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  var vertices = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  vertexBuffer.itemSize = 2;
  vertexBuffer.numItems = 4;
  return vertexBuffer;
};


/**
 * @param {WebGLRenderingContext} gl
 * @param {number} type Either VERTEX_SHADER or FRAGMENT_SHADER.
 * @param {string} src
 * @return {WebGLShader}
 */
webgl.createShader = function(gl, type, src) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
};


/**
 * @param {WebGLRenderingContext} gl
 * @param {string} vertexShaderSrc
 * @param {string} fragmentShaderSrc
 * @return {WebGLProgram}
 */
webgl.createProgram = function(gl, vertexShaderSrc, fragmentShaderSrc) {
  var program = gl.createProgram();
  var vshader = webgl.createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
  gl.attachShader(program, vshader);
  var fshader = webgl.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
  gl.attachShader(program, fshader);
  gl.linkProgram(program);
  // TODO: Detect linking error. Throw exceptions.
  console.log('Program info log: ' + gl.getProgramInfoLog(program));
  return program;
};


/**
 * @param {WebGLRenderingContext} gl
 * @param {HTMLVideoElement} videoElem
 * @param {WebGLTexture} texture
 */
webgl.getVideoFrame = function(gl, videoElem, texture) {
  // TODO: Most of this stuff only needs to happen at texture creation time.
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElem);
};


/**
 * @param {WebGLRenderingContext} gl
 * @param {WebGLUniformLocation} uniformLoc
 * @param {goog.math.Vec3} vec3
 */
webgl.uniformVec3 = function(gl, uniformLoc, vec3) {
  gl.uniform3f(uniformLoc, vec3.x, vec3.y, vec3.z);
};


/**
 * TODO: Options (texture type, clamping, interpolation, ...).
 *
 * @param {WebGLRenderingContext} gl
 * @param {number} w
 * @param {number} h
 * @param {Float32Array=} data
 * @return {WebGLTexture}
 */
webgl.createTexture = function(gl, w, h, data) {
  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                w, h,
                0, gl.RGBA, gl.FLOAT, data || null);
  return tex;
};


// ---------- webgl.TexturePair ------------------------------------------------


/**
 * @parma {WebGLRenderingContext}
 * @param {number} w
 * @param {number} h
 * @param {Float32Array=} data
 * @constructor
 */
webgl.TexturePair = function(gl, w, h, data) {
  /** @type {WebGLRenderingContext} */
  this.gl = gl;
  if (data && data.length != w * h * 4) {
    throw new Error('webGL.TexturePair: Data length doesn\'t match texture size.');
  }
  /** @type {(Float32Array|undefined} */
  this.data = data;
  /** @type {WebGLTexture} */
  this.front = webgl.createTexture(gl, w, h, data);
  /** @type {WebGLTexture} */
  this.back = webgl.createTexture(gl, w, h, data);
};


/**
 * Swaps front and back textures.
 */
webgl.TexturePair.prototype.swap = function() {
  var tmp = this.front;
  this.front = this.back;
  this.back = tmp;
};







