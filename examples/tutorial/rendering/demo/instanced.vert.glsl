attribute vec3 position;
attribute vec3 offset;
attribute vec4 color;
attribute vec4 orientationStart;
attribute vec4 orientationEnd;

varying vec3 v_Position;
varying vec4 v_Color;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float sineTime;
uniform float time;

void main() {
  v_Position = offset * max( abs( sineTime * 2.0 + 1.0 ), 0.5 ) + position;
  vec4 orientation = normalize( mix( orientationStart, orientationEnd, sineTime ) );
  vec3 vcV = cross( orientation.xyz, v_Position );
  v_Position = vcV * ( 2.0 * orientation.w ) + ( cross( orientation.xyz, vcV ) * 2.0 + v_Position );

  v_Color = color;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( v_Position, 1.0 );
}
