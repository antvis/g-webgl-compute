layout (local_size_x = 32, local_size_y = 32, local_size_z = 1) in;

layout(set = 0, binding = 0, std140) uniform Globals {
    float uSeed;
} globals;

layout(set = 0, binding = 1, rgba32f) writeonly uniform highp image2D outputTex;

float rand(inout float seed, vec2 pixel)
{
    float result = fract(sin(seed / 100.0f * dot(pixel, vec2(12.9898f, 78.233f))) * 43758.5453f);
    seed += 1.0f;
    return result;
}

void main() {
    ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);
    ivec2 imageSize = ivec2(gl_NumWorkGroups.xy * gl_WorkGroupSize.xy);
    vec2 uv = vec2(storePos) / vec2(imageSize);

    float seed = globals.uSeed;

    float n = rand(seed, uv);
    vec4 color = vec4(n, n, n, 1.0);

    imageStore(outputTex, storePos, color);
}