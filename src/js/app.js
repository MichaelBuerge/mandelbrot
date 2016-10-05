
goog.provide('app');

goog.require('orino.anim');
goog.require('orino.anim.Animation');
goog.require('orino.anim.fps.Monitor');
goog.require('orino.anim.fps.View');
goog.require('geom');
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

  app.canvasElem.onclick = app.handleCanvasClick_;

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

  app.animation = new orino.anim.Animation({
    tick: function(state) {
      app.view.iterateAndDraw();
      app.elements.numIter.innerHTML =
          app.view.iterations || (app.view.field && app.view.field.iteration) || 0;
    }
  });
  app.animation.start();

  // FPS display

  var fpsMon = new orino.anim.fps.Monitor();
  fpsMon.start();
  var fpsView = new orino.anim.fps.View(fpsMon, app.elements.fpsDisplay);

  // Dragging

  app.canvasElem.onmousedown = function(e) {
    var lastX = e.pageX;
    var lastY = e.pageY;
    var moveX = lastX;
    var moveY = lastY;
    var dragging = false;

    app.canvasElem.onmousemove = function(e) {
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
        app.view.moveBy(-dx, -dy);
        lastX = moveX;
        lastY = moveY;
      }
    });
    dragAnim.start();

    app.canvasElem.onmouseup = app.canvasElem.onmouseout = function(e) {
      dragAnim.stop();
      app.canvasElem.onmousemove = null;
      app.canvasElem.onmouseup = null;
      app.canvasElem.onmouseout = null;
      if (dragging) {
        app.setFragment();
        app.suppressClick = true;
        window.setTimeout(function() { app.suppressClick = false }, 10);
      }
    };
  };

  // Panning.

  app.panner = (function() {
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
        app.view.moveBy(step.x, step.y);
      }
    };

    return panner;
  })();



  // Keyboard control.

  document.onkeydown = function(e) {
    if (e.repeat) return;

    var kc = e.keyCode;
    if (kc == 67) {  // c
      app.view.reset();
    } else if (kc == 187) {  // +
      app.scale(1);
    } else if (kc == 189) {  // -
      app.scale(-1);

    } else if (kc == 38) {  // Arrow up
      app.panner.addComponent(app.panner.UP);
    } else if (kc == 40) {  // Arrow down
      app.panner.addComponent(app.panner.DOWN);
    } else if (kc == 37) {  // Arrow left
      app.panner.addComponent(app.panner.LEFT);
    } else if (kc == 39) {  // Arrow right
      app.panner.addComponent(app.panner.RIGHT);
    }
    console.log(kc, e);
  }
  document.onkeyup = function(e) {
    var kc = e.keyCode;
    if (kc == 38) {  // Arrow up
      app.panner.removeComponent(app.panner.UP);
    } else if (kc == 40) {  // Arrow down
      app.panner.removeComponent(app.panner.DOWN);
    } else if (kc == 37) {  // Arrow left
      app.panner.removeComponent(app.panner.LEFT);
    } else if (kc == 39) {  // Arrow right
      app.panner.removeComponent(app.panner.RIGHT);
    }

  }
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


/**
 * @param {Event} e
 * @private
 */
app.handleCanvasClick_ = function(e) {
  if (app.suppressClick) return;

  var rect = app.canvasElem.getBoundingClientRect();
  var pixelRatio = window.devicePixelRatio;
  var x = (e.clientX - rect.left) * pixelRatio;
  var y = (e.clientY - rect.top) * pixelRatio;

  var dx = x - rect.width * pixelRatio / 2
  var dy = y - rect.height * pixelRatio / 2;

  app.view.moveBy(dx, dy);
  app.setFragment();
};


app.resetView = function() {
  app.view.cutout.reset();
  app.setFragment();
  app.view.reset();
};


app.pan = function(x, y) {
  app.view.moveBy(x, y);
};


app.scale = function(dMagn) {
  var cutout = app.view.cutout;
  cutout.setMagnitude(cutout.magnitude + dMagn);
  app.setFragment();
  app.view.reset();
  app.elements.magnitude.innerHTML = cutout.magnitude;
};

