struct Particle {
  vec2 pos;
  vec2 vel;
};

layout(std140, set = 0, binding = 0) uniform SimParams {
  float deltaT;
  float noiseSize;
} params;

layout(std140, set = 0, binding = 1) buffer ParticlesA {
  Particle particles[1500];
} particlesA;

layout(std140, set = 0, binding = 2) buffer ParticlesB {
  Particle particles[1500];
} particlesB;

void main() {
  uint index = gl_GlobalInvocationID.x;
  if (index >= 1500) { return; }

  vec2 vPos = particlesA.particles[index].pos;
  vec2 vVel = particlesA.particles[index].vel;

  vec2 force = vec2(0.);
  vec2 dif = particlesB.particles[index].pos - vec2(0.);
  force -= length( dif ) * length( dif ) * normalize( dif ) * .1;

  vVel += force;
  vVel = normalize(vVel);

  vPos += vVel * params.deltaT;

  particlesB.particles[index].pos = vPos;
  particlesB.particles[index].vel = vVel;
}