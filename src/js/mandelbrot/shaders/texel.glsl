

vec4 texel(sampler2D tex, vec2 size, vec2 px) {
  // Flip y-axis.
  px.y = size.y - 1.0 - px.y;
  
  vec2 pos = (2.0 * px + 1.0) / (2.0 * size);

  return texture2D(tex, pos);
}


#pragma glslify: export(texel)
