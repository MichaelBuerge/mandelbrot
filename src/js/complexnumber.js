

goog.provide('ComplexNumber');




/**
 * @param {number=} r
 * @param {number=} i
 * @constructor
 */
ComplexNumber = function(r, i) {
  this.r = r || 0;
  this.i = i || 0;
};


ComplexNumber.prototype.toString = function() {
  return ['(', this.r, (this.i > 0 ? '+' : ''), this.i, 'i', ')'].join('');
};


/**
 * @return {ComplexNumber}
 */
ComplexNumber.prototype.zero = function() {
  this.r = 0;
  this.i = 0;
  return this;
};


/**
 * @return {ComplexNumber}
 */
ComplexNumber.prototype.copy = function() {
  return new ComplexNumber(this.r, this.i);
};


/**
 * @param {ComplexNumber} a
 * @param {ComplexNumber} b
 * @param {ComplexNumber=} res
 * @return {ComplexNumber}
 */
ComplexNumber.add = function(a, b, res) {
  if (!res) res = new ComplexNumber;
  res.r = a.r + b.r;
  res.i = a.i + b.i;
  return res;  
};


/**
 * @param {ComplexNumber} b
 * @param {ComplexNumber=} res
 * @return {ComplexNumber}
 */
ComplexNumber.prototype.add = function(b, res) {
  return ComplexNumber.add(this, b, this);
};


/**
 * @param {ComplexNumber} a
 * @param {ComplexNumber} b
 * @param {ComplexNumber=} res
 * @return {ComplexNumber}
 */
ComplexNumber.subtract = function(a, b, res) {
  if (!res) res = new ComplexNumber;
  res.r = a.r - b.r;
  res.i = b.r - b.i;
  return res;  
};


/**
 * @param {ComplexNumber} b
 * @param {ComplexNumber=} res
 * @return {ComplexNumber}
 */
ComplexNumber.prototype.subtract = function(b, res) {
  return ComplexNumber.subtract(this, b, this);
};


/**
 * @param {ComplexNumber} a
 * @param {ComplexNumber} b
 * @param {ComplexNumber=} res
 * @return {ComplexNumber}
 */
ComplexNumber.mult = function(a, b, res) {
  if (!res) res = new ComplexNumber;
  var r = a.r * b.r - a.i * b.i;
  var i = a.r * b.i + a.i * b.r;
  res.r = r;
  res.i = i;
  return res;
};


/**
 * @param {ComplexNumber} b
 * @param {ComplexNumber=} res
 * @return {ComplexNumber}
 */
ComplexNumber.prototype.mult = function(b, res) {
  return ComplexNumber.mult(this, b, this);
};


/**
 * @param {ComplexNumber=} res
 */
ComplexNumber.prototype.square = function(res) {
  return this.mult(this, this);
};


/**
 * return {number}
 */
ComplexNumber.prototype.squaredAbs = function() {
  return this.r * this.r + this.i * this.i;
};


/**
 * @return {number}
 */
ComplexNumber.prototype.abs = function() {
  return Math.sqrt(this.squaredAbs());
};


/**
 * @param {ComplexNumber} a
 * @param {ComplexNumber} b
 * @param {ComplexNumber=} res
 * @return {ComplexNumber} 
 */
ComplexNumber.divide = function(a, b, res) {
  if (!res) res = new ComplexNumber;
  var denom = b.squaredAbs();
  var r = (a.r * b.i + a.i * b.i) / denom;
  var i = (a.i * b.r - a.r * b.i) / denom;
};


/**
 * @param {ComplexNumber} b
 * @param {ComplexNumber=} res
 * @return {ComplexNumber}
 */
ComplexNumber.prototype.divide = function(b, res) {
  return ComplexNumber.divide(this, b, res);
};