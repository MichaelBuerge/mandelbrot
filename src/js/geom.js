  

goog.provide('geom');



/**
 * @param {number} opt_x
 * @param {number} opt_y
 * @constructor
 */
geom.Vec2 = function(opt_x, opt_y) {
  /** @type {number} */
  this.x = opt_x || 0;
  /** @type {number} */
  this.y = opt_y || 0;
};


/**
 * @param {geom.Vec2=} opt_res
 * @return {geom.Vec2}
 */
geom.Vec2.randomUnit = function(opt_res) {
  var v = opt_res || new geom.Vec2;
  var a = Math.random() * Math.PI * 2;
  v.x = Math.sin(a);
  v.y = Math.cos(a);
  return v;
};


/**
 * @param {geom.Vec2} a
 * @param {geom.Vec2} b
 * @return {geom.Vec2}
 */
geom.Vec2.sum = function(a, b) {
  return new geom.Vec2(a.x + b.x, a.y + b.y);
};


/**
 * @param {geom.Vec2} a
 * @param {geom.Vec2} b
 * @return {geom.Vec2} a - b
 */
geom.Vec2.difference = function(a, b) {
  return new geom.Vec2(a.x - b.x, a.y - b.y);
};


/**
 * @param {geom.Vec2} a
 * @param {geom.Vec2} b
 * @param {number} t
 * @return {geom.Vec2}
 */
geom.Vec2.lerp = function(a, b, t) {
  var dx = b.x - a.x;
  var dy = b.y - a.y;
  return new geom.Vec2(
      a.x + t * dx,
      a.y + t * dy);
};


/**
 * @param {geom.Vec2} a
 * @param {geom.Vec2} b
 * @return {number}
 */
geom.Vec2.distance = function(a, b) {
  var dx = b.x - a.x;
  var dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
};


/**
 * @return {geom.Vec2}
 */
geom.Vec2.prototype.zero = function() {
  this.x = 0;
  this.y = 0;
  return this;
};


/**
 * @param {geom.Vec2} x
 * @return {geom.Vec2}
 */
geom.Vec2.prototype.set = function(vec) {
  this.x = vec.x;
  this.y = vec.y;
  return this;
};


/**
 * @return {number}
 */
geom.Vec2.prototype.length = function() {
  return Math.sqrt(this.x * this.x + this.y * this.y);
};


/**
 * @return {geom.Vec2}
 */
geom.Vec2.prototype.normalize = function() {
  var len = this.length();
  if (len == 0) return this;

  var factor = 1 / this.length();
  this.scale(factor);
  return this;
};


/**
 * @param {geom.Vec2} v
 * @returnt {geom.Vec2}
 */
geom.Vec2.prototype.add = function(v) {
  this.x += v.x;
  this.y += v.y;
  return this;
};


/**
 * @param {geom.Vec2} v
 * @returnt {geom.Vec2}
 */
geom.Vec2.prototype.subtract = function(v) {
  this.x -= v.x;
  this.y -= v.y;
  return this;
};


/**
 * @param {number} factor
 * @return {geom.Vec2}
 */
geom.Vec2.prototype.scale = function(factor) {
  this.x *= factor;
  this.y *= factor;
  return this;
};


/**
 * @param {function(number):number} fn
 * @return {geom.Vec2}
 */
geom.Vec2.prototype.map = function(fn) {
  this.x = fn(this.x);
  this.y = fn(this.y);
  return this;
};


/**
 * @return {geom.Vec2}
 */
geom.Vec2.prototype.copy = function() {
  return new geom.Vec2(this.x, this.y);
};


/**
 * @return {string}
 */
geom.Vec2.prototype.toString = function() {
  return ['(', this.x, ',', this.y, ')'].join('');
};



// --------------------------------------------------------------------------


/**
 * Finds the nearest point to r on the line going through p and q.
 * Returns the scalar t. Evaluate p + t (q - p) to obtain the point.
 * @param {geom.Vec2} p 
 * @param {geom.Vec2} q
 * @param {geom.Vec2} r
 * @return {number}
 */
geom.nearestPointOnLine = function(p, q, r) {
  var dx = q.x - p.x;
  var dy = q.y - p.y;
  var sqLen = dx * dx + dy * dy;
  var t = ((r.x - p.x) * dx + (r.y - p.y) * dy) / sqLen;
  return t;
};


/**
 * @param {geom.Vec2} v
 * @param {Snap.Matrix} m
 * @param {geom.Vec2} opt_res
 * @return {geom.Vec2}
 */
geom.vecMatMult = function(vec, mat, opt_res) {
  var res = opt_res || new geom.Vec2;
  res.x = mat.x(vec.x, vec.y);
  res.y = mat.y(vec.x, vec.y);
  return res;
};


// --------------------------------------------------------------------------


/**
 * @param {number=} t
 * @param {number=} r
 * @param {number=} b
 * @param {number=} l
 * @constructor
 */
geom.Rect = function(t, r, b, l) {
  this.t = t || 0;
  this.r = r || 0;
  this.b = b || 0;
  this.l = l || 0;
};

/** @return {number} */
geom.Rect.prototype.width = function() {
  return this.r - this.l;
};

/** @return {number} */
geom.Rect.prototype.height = function() {
  return this.b - this.t;
};

/** @return {geom.Vec2} */
geom.Rect.prototype.size = function() {
  return new geom.Vec2(this.width(), this.height());
};

/** @return {geom.Vec2} */
geom.Rect.prototype.center = function() {
  return new geom.Vec2((this.r + this.l) / 2, (this.t + this.b) / 2);
};


/** @return {geom.Vec2} */
geom.Rect.prototype.toString = function() {
  return 'rect(' + [this.t, this.r, this.b, this.l].join(', ') + ')';
};


