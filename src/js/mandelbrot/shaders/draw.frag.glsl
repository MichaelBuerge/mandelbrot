precision highp float;
precision highp int;

uniform vec2 size;
uniform sampler2D field;
uniform int iterations;
uniform int visualization;
uniform int logarithmic;
uniform int periodic;
uniform int period;
uniform float phase;
uniform int periodAnchor;
uniform int mirror;

#pragma glslify: texel = require('./texel.glsl')


int PERIOD_ANCHOR_FRONT = 1;


// Single precision floating point number use 23 bits for the fraction.
// 2^(23-1) = 4194304
float INT_PACK_FACTOR = 4194304.0;

int BLACK_AND_WHITE = 1;
int GREY_SCALE = 2;



void main() {
  vec2 px = gl_FragCoord.xy - 0.5;
  px.y = size.y - px.y - 1.0;

  vec4 tx = texel(field, size, px);
  float real = tx[0];
  float img = tx[1];
  float n = tx[2] * INT_PACK_FACTOR;
  float diverging = tx[3];

  if (visualization == BLACK_AND_WHITE) {
    if (diverging == 0.0) {
      gl_FragColor = vec4(0, 0, 0, 1);
    } else {
      gl_FragColor = vec4(1, 1, 1, 1);
    }

  } else if (visualization == GREY_SCALE) {
    if (diverging == 0.0) {
      gl_FragColor = vec4(0, 0, 0, 1);
    } else {
      float max = float(iterations);

      if (periodic == 1) {
        if (periodAnchor == PERIOD_ANCHOR_FRONT) {
          n += float(period) - mod(float(iterations), float(period));
        }
        // Apply phase.
        n += phase * float(period);
        // Modulo.
        n = mod(n, float(period));
        max = float(period) - 1.0;

        if (mirror == 1) {
          n = n * 2.0;
          if (n > max) {
            n = max - (n - max);
          }
        }
        if (logarithmic == 1) {
          n += 1.0;
          max += 1.0;
        }
      }

      float v;
      if (logarithmic == 1) {
        v = log2(n) / log2(max);
      } else {
        v = n / max;
      }
      gl_FragColor = vec4(v, v, v, 1);
    }
  }
}
  