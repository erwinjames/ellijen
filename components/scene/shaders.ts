// GLSL for the public scene. WebGL renderer only (ShaderMaterial), see threejs-shaders skill.

export const particleVertex = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uRise;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    vec3 p = position;
    float t = uTime * 0.15 + aSeed * 6.2831;
    p.x += sin(t * 1.3 + aSeed * 10.0) * 0.25;
    p.z += cos(t + aSeed * 7.0) * 0.2;
    // endless upward drift, wraps inside a 10 unit tall column
    p.y = mod(position.y + 5.0 + uTime * (0.08 + aSeed * 0.12) + uRise * 2.0, 10.0) - 5.0;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float twinkle = 0.55 + 0.45 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 40.0);
    vAlpha = twinkle;
    vSeed = aSeed;
    gl_PointSize = aSize * uPixelRatio * twinkle * (30.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

export const particleFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    vec4 s = texture2D(uMap, gl_PointCoord);
    vec3 c = mix(uColorA, uColorB, vSeed);
    gl_FragColor = vec4(c, s.a * vAlpha);
  }
`;

export const backdropVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const backdropFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uAccent;
  varying vec2 vUv;

  float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453); }
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) { v += amp * noise(p); p *= 2.0; amp *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float n = fbm(uv * 3.0 + vec2(uTime * 0.02, -uTime * 0.015));
    vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, uv.y + (n - 0.5) * 0.4));
    float glow = smoothstep(0.6, 0.0, distance(uv, vec2(0.5, 0.45)));
    col += uAccent * glow * (0.35 + 0.15 * sin(uTime * 0.5));
    col += uAccent * pow(n, 3.0) * 0.5;
    gl_FragColor = vec4(col, 1.0);
  }
`;

// Full-screen grade pass: chromatic aberration + vignette + film grain.
export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0.006 },
    uVignette: { value: 0.75 },
    uGrain: { value: 0.035 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAberration;
    uniform float uVignette;
    uniform float uGrain;
    varying vec2 vUv;

    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec2 dir = vUv - 0.5;
      float d = length(dir);
      float r = texture2D(tDiffuse, vUv - dir * uAberration * d).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv + dir * uAberration * d).b;
      vec3 c = vec3(r, g, b);
      c *= 1.0 - smoothstep(0.35, 0.95, d) * uVignette;
      c += (rand(vUv * 1000.0 + fract(uTime)) - 0.5) * uGrain;
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};
