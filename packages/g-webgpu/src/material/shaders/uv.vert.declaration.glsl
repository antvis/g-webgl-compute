#ifdef USE_UV
  attribute vec2 uv;
	#ifdef UVS_VERTEX_ONLY
    vec2 vUv;
	#else
		varying vec2 vUv;
	#endif
	uniform mat3 uvTransform;
#endif