export const MATH_FUNCTIONS = [
  {
    name: 'lengthA',
    always: false,
    usesTime: false,
    body: `vec4 lengthA(vec4 a) { return vec4(length(a)); }`,
  },
  {
    name: 'asinA',
    always: false,
    usesTime: false,
    body: `vec4 asinA(vec4 a) { return asin(clamp(a,-1.,1.)); }`,
  },
  {
    name: 'acosA',
    always: false,
    usesTime: false,
    body: `vec4 acosA(vec4 a) { return acos(clamp(a,-1.,1.)); }`,
  },
  {
    name: 'logA',
    always: false,
    usesTime: false,
    body: `vec4 logA(vec4 a) { return log(abs(a)+1e-5); }`,
  },
  {
    name: 'log2A',
    always: false,
    usesTime: false,
    body: `vec4 log2A(vec4 a) { return log2(abs(a)+1e-5); }`,
  },
  {
    name: 'sqrtA',
    always: false,
    usesTime: false,
    body: `vec4 sqrtA(vec4 a) { return sqrt(abs(a)); }`,
  },
  {
    name: 'inversesqrtA',
    always: false,
    usesTime: false,
    body: `vec4 inversesqrtA(vec4 a) { return inversesqrt(abs(a)+1e-5); }`,
  },
  {
    name: 'pow2',
    always: false,
    usesTime: false,
    body: `vec4 pow2(vec4 a) { return a*a; }`,
  },
  {
    name: 'pow3',
    always: false,
    usesTime: false,
    body: `vec4 pow3(vec4 a) { return a*a*a; }`,
  },
  {
    name: 'pow4',
    always: false,
    usesTime: false,
    body: `vec4 pow4(vec4 a) { vec4 b=a*a; return b*b; }`,
  },
  {
    name: 'smoothA',
    always: false,
    usesTime: false,
    body: `vec4 smoothA(vec4 a) { return smoothstep(vec4(0.),vec4(1.),a); }`,
  },
  {
    name: 'smoothclampA',
    always: false,
    usesTime: false,
    body: `vec4 smoothclampA(vec4 a) { return clamp(a*a*(3.-2.*a),0.,1.); }`,
  },
];
