layout(location = 0) in vec3 position;
layout(location = 1) in vec3 offset;
layout(location = 2) in vec4 color;
layout(location = 3) in vec4 orientationStart;
layout(location = 4) in vec4 orientationEnd;

layout(location = 0) out vec3 v_Position;
layout(location = 1) out vec4 v_Color;

layout(set = 0, binding = 0) uniform Builtin {
  mat4 projectionMatrix;
  mat4 modelViewMatrix;
} builtin;

layout(set = 0, binding = 1) uniform SimParams {
  float sineTime;
  float time;
} params;

void main() {
  v_Position = offset * max( abs( params.sineTime * 2.0 + 1.0 ), 0.5 ) + position;
  vec4 orientation = normalize( mix( orientationStart, orientationEnd, params.sineTime ) );
  vec3 vcV = cross( orientation.xyz, v_Position );
  v_Position = vcV * ( 2.0 * orientation.w ) + ( cross( orientation.xyz, vcV ) * 2.0 + v_Position );

  v_Color = color;

  gl_Position = builtin.projectionMatrix * builtin.modelViewMatrix * vec4( v_Position, 1.0 );
}
