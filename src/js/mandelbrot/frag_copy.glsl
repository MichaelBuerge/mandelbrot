
precision highp float;

uniform vec2 size;

uniform sampler2D field;

uniform vec2 offset;


// TODO: Figure out details of texture lookup.
vec4 texel(sampler2D tex, vec2 size, vec2 px) {
  px.y = size.y - 1.0 - px.y;
  
  vec2 pos = (2.0 * px + 1.0) / (2.0 * size);

  return texture2D(tex, pos);
}


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

