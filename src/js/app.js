
goog.provide('app');

goog.require('orino.anim');
goog.require('orino.anim.Animation');
goog.require('orino.anim.fps.Monitor');
goog.require('orino.anim.fps.View');
goog.require('geom');
goog.require('goog.events');
goog.require('goog.Uri');
goog.require('mandelbrot.WebglView');
goog.require('ComplexNumber');


var app = {};

app.init = function() {

  app.canvasElem = document.querySelector('canvas');

  app.view = new mandelbrot.WebglView(app.canvasElem);

  app.elements = {
    fpsDisplay: document.querySelector('#fps-display'),
    ipuInput: document.querySelector('#ipu-input'),
    ipuDisplay: document.querySelector('#ipu-display'),
    numIter: document.querySelector('#num-iter'),
    magnitude: document.querySelector('#magnitude'),
    periodDisplay: document.querySelector('#period-display'),
  }

  // Get center/zoom from fragment identifier (if present).
  var uri = new goog.Uri(window.location.href);
  if (uri.hasFragment()) {
    var fragmentArgs = new goog.Uri.QueryData(uri.getFragment());
    var real = Number(fragmentArgs.get('real'));
    var img = Number(fragmentArgs.get('img'));
    if (goog.isNumber(real) && !isNaN(real) && goog.isNumber(img) && !isNaN(img)) {
      var center = new ComplexNumber(real, img);
      app.view.cutout.setCenter(center);
    }
    var magn = parseInt(fragmentArgs.get('magn'), 10);
    if (goog.isNumber(magn) && !isNaN(magn)) {
      app.view.cutout.setMagnitude(magn);
      app.elements.magnitude.innerHTML = magn;
    }
  }

  var fragmentUpdateTimer = 0;
  goog.events.listen(app.view, 'cutoutchange', function(e) {
    // Setting the fragment is slow. Therefore limiting the rate it's updated.
    if (!fragmentUpdateTimer) {
      fragmentUpdateTimer = window.setTimeout(
          function() {
            app.setFragment();
            fragmentUpdateTimer = 0;
          },
          200);
    }
    app.elements.magnitude.innerHTML = app.view.cutout.magnitude;
  });

  goog.events.listen(app.view, 'iterationschange', function(e) {
    app.elements.numIter.innerHTML = e.iterations;
  })

  app.elements.ipuInput.onchange = function(e) {
    app.setIterationsPerUpdate(Number(this.value) || 1);
  };

  // Visualization settings

  function toArray(arrayLike) { return Array.prototype.slice.call(arrayLike) }

  toArray(document.querySelectorAll('input[type=radio][name=mode]'))
    .forEach(function(elem) {
      elem.onclick = function() {
        app.view.visualization = parseInt(this.value);
      };
    });

  toArray(document.querySelectorAll('[type=radio][name=scaling]'))
    .forEach(function(elem) {
      elem.onclick = function() {
        app.view.visualizationOpts.greyScale.logarithmic = parseInt(this.value); 
      };
    });

  document.querySelector('input[name=periodic]').onclick = function() {
    app.view.visualizationOpts.greyScale.periodic = this.checked;
  };
  document.querySelector('input[name=period]').onchange = function() {
    var period = parseInt(this.value);
    app.view.visualizationOpts.greyScale.period = period;
    app.elements.periodDisplay.innerHTML = period;
  };
  toArray(document.querySelectorAll('input[type=radio][name="period-anchor"]'))
    .forEach(function(elem) {
      elem.onclick = function() {
        app.view.visualizationOpts.greyScale.periodAnchor = parseInt(this.value);
      };
    });
  document.querySelector('#smooth-toggle').onclick = function() {
    app.view.visualizationOpts.greyScale.smooth = this.checked;
  };


  // Animation

  app.view.startRenderLoop();

  // FPS display

  var fpsMon = new orino.anim.fps.Monitor();
  fpsMon.start();
  var fpsView = new orino.anim.fps.View(fpsMon, app.elements.fpsDisplay);
};


/**
 * Sets the fragment identifier.
 */
app.setFragment = function() {
  var fragmentArgs = new goog.Uri.QueryData();
  var cutout = app.view.cutout;

  var center = cutout.center;
  fragmentArgs.set('real', center.r);
  fragmentArgs.set('img', center.i);

  var magn = cutout.magnitude;
  fragmentArgs.set('magn', magn);

  var href = new goog.Uri(window.location.href);
  href.setFragment(fragmentArgs.toDecodedString());

  window.location.replace(href.toString());
};


app.resize = function() {
  app.view.updateSize();
};
window.onresize = function() {
  window.clearTimeout(arguments.callee.timer);
  arguments.callee.timer = window.setTimeout(
    function() {
      app.resize();
    },
    200);
};


app.setIterationsPerUpdate = function(ipu) {
  app.view.iterationsPerUpdate = ipu;
  app.elements.ipuDisplay.innerHTML = ipu;
}


// ---------- View manipulation. -----------------------------------------------


app.resetView = function() {
  app.view.cutout.reset();
  app.setFragment();
  app.view.reset();
};


app.pan = function(x, y) {
  app.view.moveBy(x, y);
};


app.scale = function(dMagn) {
  app.view.scale(dMagn);
};

