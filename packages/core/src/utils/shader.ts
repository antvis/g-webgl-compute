export function getLengthFromFormat(format: string) {
  if (format === 'float4') {
    return 4;
  } else if (format === 'float3') {
    return 3;
  } else if (format === 'float2') {
    return 2;
  } else if (format === 'float') {
    return 1;
  } else if (format === 'mat3') {
    return 9;
  } else if (format === 'mat4') {
    return 16;
  }
  return 0;
}
