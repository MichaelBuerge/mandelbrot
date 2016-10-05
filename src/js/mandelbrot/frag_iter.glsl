precision highp float;
precision highp int;

uniform vec2 size;
uniform vec2 tl;
uniform float delta;
uniform int iterationsPerUpdate;
uniform int targetIterations;
uniform int catchUpSpeedUp;
uniform sampler2D field;

// Single precision floating point number use 23 bits for the fraction.
// 2^(23-1) = 4194304
float INT_PACK_FACTOR = 4194304.0;


// TODO: Figure out details of texture lookup.
vec4 texel(sampler2D tex, vec2 size, vec2 px) {
  px.y = size.y - 1.0 - px.y;
  
  vec2 pos = (2.0 * px + 1.0) / (2.0 * size);

  return texture2D(tex, pos);
}


void main() {
  vec2 px = gl_FragCoord.xy - 0.5;
  px.y = size.y - px.y - 1.0;

  vec4 tx = texel(field, size, px);
  float diverging = tx[3];

  if (diverging > 0.0) {
    gl_FragColor = tx;
    return;
  }

  vec2 c = tl + vec2(px.x, -px.y) * delta;
  float cr = c[0];
  float ci = c[1];

  float zr = tx[0];
  float zi = tx[1];
  float n = tx[2] * INT_PACK_FACTOR;

  float r;
  float i;
  // NOTE: Cannot use uniform n in a loop condition:
  // "Loop index cannot be compared with non-constant expression."

  int numIter = iterationsPerUpdate;
  if (int(n) + iterationsPerUpdate < targetIterations) {
    numIter *= catchUpSpeedUp;
  }

  for (int idx = 0; idx < 100; idx++) {
    if (idx == numIter) break;

    r = zr * zr - zi * zi + cr;
    i = zr * zi + zi * zr + ci;
    zr = r;
    zi = i;
    n += 1.0;

    if (r * r + i * i > 4.0) {
      diverging = 1.0;
      break;
    }
  }

  gl_FragColor = vec4(r, i, n / INT_PACK_FACTOR, diverging);
}

