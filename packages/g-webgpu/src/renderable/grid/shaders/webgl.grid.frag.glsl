// generate grid, borrow from clay.gl viewer
// @see https://github.com/pissang/clay-viewer/blob/master/src/graphic/ground.glsl
#extension GL_OES_standard_derivatives : enable

varying vec3 v_Position;
// varying vec3 v_Normal;

uniform float u_GridSize : 5;
uniform float u_GridSize2 : .5;
uniform vec4 u_GridColor : [0, 0, 0, 1];
uniform vec4 u_GridColor2 : [0.3, 0.3, 0.3, 1];
uniform bool u_GridEnabled : true;

// uniform vec3 u_LightDirection;
// uniform vec3 u_LightColor;
// uniform vec3 u_Camera;

void main() {
  // vec3 n = v_Normal;
  // vec3 l = normalize(u_LightDirection);
  // float NdotL = clamp(dot(n, l), 0.001, 1.0);

  gl_FragColor = vec4(1.);

  if (u_GridEnabled) {
    float wx = v_Position.x;
    float wz = v_Position.z;
    // float x0 = abs(fract(wx / u_GridSize - 0.5) - 0.5) / fwidth(wx) * u_GridSize / 2.0;
    // float z0 = abs(fract(wz / u_GridSize - 0.5) - 0.5) / fwidth(wz) * u_GridSize / 2.0;

    float x1 = abs(fract(wx / u_GridSize2 - 0.5) - 0.5) / fwidth(wx) * u_GridSize2;
    float z1 = abs(fract(wz / u_GridSize2 - 0.5) - 0.5) / fwidth(wz) * u_GridSize2;

    // float v0 = 1.0 - clamp(min(x0, z0), 0.0, 1.0);
    float v1 = 1.0 - clamp(min(x1, z1), 0.0, 1.0);
    // if (v0 > 0.1) {
        // gl_FragColor = mix(gl_FragColor, u_GridColor, v0);
    // }
    // else {
        gl_FragColor = mix(gl_FragColor, u_GridColor2, v1);
    // }
  }

  // float shadowFactor = calcShadow(u_ShadowMap, v_PositionFromLight, l, n);
  // vec3 diffuseColor = u_LightColor * NdotL * shadowFactor;

  // gl_FragColor.rgb *= diffuseColor;
}