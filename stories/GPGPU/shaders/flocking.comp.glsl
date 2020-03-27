// @see https://github.com/austinEng/Project6-Vulkan-Flocking/blob/master/data/shaders/computeparticles/particle.comp

struct Particle {
  vec2 pos;
  vec2 vel;
};

layout(std140, set = 0, binding = 0) uniform SimParams {
  float deltaT;
  float rule1Distance;
  float rule2Distance;
  float rule3Distance;
  float rule1Scale;
  float rule2Scale;
  float rule3Scale;
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

  vec2 cMass = vec2(0.0, 0.0);
  vec2 cVel = vec2(0.0, 0.0);
  vec2 colVel = vec2(0.0, 0.0);
  int cMassCount = 0;
  int cVelCount = 0;

  vec2 pos;
  vec2 vel;
  for (int i = 0; i < 1500; ++i) {
    if (i == index) { continue; }
    pos = particlesA.particles[i].pos.xy;
    vel = particlesA.particles[i].vel.xy;

    if (distance(pos, vPos) < params.rule1Distance) {
      cMass += pos;
      cMassCount++;
    }
    if (distance(pos, vPos) < params.rule2Distance) {
      colVel -= (pos - vPos);
    }
    if (distance(pos, vPos) < params.rule3Distance) {
      cVel += vel;
      cVelCount++;
    }
  }
  if (cMassCount > 0) {
    cMass = cMass / cMassCount - vPos;
  }
  if (cVelCount > 0) {
    cVel = cVel / cVelCount;
  }

  vVel += cMass * params.rule1Scale + colVel * params.rule2Scale + cVel * params.rule3Scale;

  // clamp velocity for a more pleasing simulation.
  vVel = normalize(vVel) * clamp(length(vVel), 0.0, 0.1);

  // kinematic update
  vPos += vVel * params.deltaT;

  // Wrap around boundary
  if (vPos.x < -1.0) vPos.x = 1.0;
  if (vPos.x > 1.0) vPos.x = -1.0;
  if (vPos.y < -1.0) vPos.y = 1.0;
  if (vPos.y > 1.0) vPos.y = -1.0;

  particlesB.particles[index].pos = vPos;

  // Write back
  particlesB.particles[index].vel = vVel;
}