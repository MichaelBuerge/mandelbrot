
precision highp float;

uniform vec2 size;

uniform sampler2D field;

uniform vec2 offset;


#pragma glslify: texel = require('./texel.glsl')


void main() {
  vec2 px = gl_FragCoord.xy - 0.5;
  px.y = size.y - 1.0 - px.y;

  px += offset;

  if (px.x < 0.0 || px.x >= size.x || px.y < 0.0 || px.y >= size.y) {
    gl_FragColor = vec4(0,0,0,0);
  } else {
    gl_FragColor = texel(field, size, px);
  }
}
