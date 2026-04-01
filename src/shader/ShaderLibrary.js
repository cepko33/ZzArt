/**
 * ShaderLibrary.js
 *
 * Declarative GLSL standard-library for ZzArt.
 *
 * Each entry in SHADER_LIB_FUNCTIONS describes one helper function that may
 * be emitted into the shader preamble.  Fields:
 *
 *   name        {string}   – GLSL function name referenced by ShaderStatement
 *   always      {boolean}  – if true, always emitted; otherwise only when the
 *                            function name appears in shaderStatements
 *   usesTime    {boolean}  – if true the body contains an `iTime` reference.
 *                            GetCode() selects the timed body when the shader's
 *                            useTimeInLibrary flag is set (randomly chosen per
 *                            ShaderObject).
 *   body        {string}   – GLSL source (no trailing newline needed)
 *   bodyTimed   {string?}  – alternative body that mixes in iTime.  Falls back
 *                            to `body` when omitted.
 *
 * To add a new stdlib function just append an entry here – no changes to
 * ShaderObject or ShaderStatement are required.
 */

export const SHADER_LIB_FUNCTIONS = [
  // ── Safe domain-clamping wrappers ──────────────────────────────────────────
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

  // ── Power helpers ─────────────────────────────────────────────────────────
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

  // ── Folding / symmetry helpers ────────────────────────────────────────────
  {
    name: 'foldA',
    always: false,
    usesTime: false,
    body: `vec4 foldA(vec4 a) { return abs(fract(a)-0.5)*2.; }`,
    bodyTimed: `vec4 foldA(vec4 a) { return abs(fract(a + iTime*0.05)-0.5)*2.; }`,
  },
  {
    name: 'mirrorA',
    always: false,
    usesTime: false,
    body: `vec4 mirrorA(vec4 a) { return 1.-abs(fract(a*0.5)*2.-1.); }`,
    bodyTimed: `vec4 mirrorA(vec4 a) { return 1.-abs(fract(a*0.5 + iTime*0.03)*2.-1.); }`,
  },

  // ── Smooth-step wrappers ──────────────────────────────────────────────────
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

  // ── Wave / oscillator helpers ─────────────────────────────────────────────
  {
    name: 'sinCosA',
    always: false,
    usesTime: false,
    body: `vec4 sinCosA(vec4 a) { return vec4(sin(a.xy), cos(a.zw)); }`,
    bodyTimed: `vec4 sinCosA(vec4 a) { float t=iTime*0.1; return vec4(sin(a.xy+t), cos(a.zw-t)); }`,
  },
  {
    name: 'waveA',
    always: false,
    usesTime: true,
    body: `vec4 waveA(vec4 a) { return sin(a*6.2831853)*0.5+0.5; }`,
    bodyTimed: `vec4 waveA(vec4 a) { return sin(a*6.2831853 + iTime*0.2)*0.5+0.5; }`,
  },
  {
    name: 'pulseA',
    always: false,
    usesTime: true,
    body: `vec4 pulseA(vec4 a) { return step(0.5, fract(a)); }`,
    bodyTimed: `vec4 pulseA(vec4 a) { return step(0.5, fract(a + iTime*0.07)); }`,
  },
  {
    name: 'sawA',
    always: false,
    usesTime: false,
    body: `vec4 sawA(vec4 a) { return fract(a); }`,
    bodyTimed: `vec4 sawA(vec4 a) { return fract(a + iTime*0.1); }`,
  },

  // ── Domain-distortion helpers ─────────────────────────────────────────────
  {
    name: 'twistA',
    always: false,
    usesTime: true,
    body: `vec4 twistA(vec4 a) { float s=sin(a.z),c=cos(a.z); return vec4(a.x*c-a.y*s, a.x*s+a.y*c, a.zw); }`,
    bodyTimed: `vec4 twistA(vec4 a) { float k=a.z+iTime*0.05; float s=sin(k),c=cos(k); return vec4(a.x*c-a.y*s, a.x*s+a.y*c, a.zw); }`,
  },
  {
    name: 'polarA',
    always: false,
    usesTime: false,
    body: `vec4 polarA(vec4 a) { float r=length(a.xy); float th=atan(a.y,a.x); return vec4(r,th,r,th); }`,
    bodyTimed: `vec4 polarA(vec4 a) { float r=length(a.xy); float th=atan(a.y,a.x)+iTime*0.04; return vec4(r,th,r,th); }`,
  },

  // ── Cellular / hash helpers ───────────────────────────────────────────────
  {
    name: 'hashA',
    always: false,
    usesTime: false,
    body: `vec4 hashA(vec4 a) { return fract(sin(a*127.1+vec4(311.7,74.7,547.3,233.1))*43758.547); }`,
    bodyTimed: `vec4 hashA(vec4 a) { return fract(sin((a+iTime*0.001)*127.1+vec4(311.7,74.7,547.3,233.1))*43758.547); }`,
  },
  {
    name: 'noiseA',
    always: false,
    usesTime: false,
    body: `vec4 noiseA(vec4 a) { vec4 i=floor(a); vec4 f=fract(a); f=f*f*(3.-2.*f); vec4 h=fract(sin(i*127.1+vec4(311.7,74.7,547.3,233.1))*43758.547); vec4 h2=fract(sin((i+1.)*127.1+vec4(311.7,74.7,547.3,233.1))*43758.547); return mix(h,h2,f); }`,
    bodyTimed: `vec4 noiseA(vec4 a) { vec4 at=a+iTime*0.05; vec4 i=floor(at); vec4 f=fract(at); f=f*f*(3.-2.*f); vec4 h=fract(sin(i*127.1+vec4(311.7,74.7,547.3,233.1))*43758.547); vec4 h2=fract(sin((i+1.)*127.1+vec4(311.7,74.7,547.3,233.1))*43758.547); return mix(h,h2,f); }`,
  },

  // ── Signed-distance helpers ───────────────────────────────────────────────
  {
    name: 'circleA',
    always: false,
    usesTime: false,
    body: `vec4 circleA(vec4 a) { return vec4(length(a.xy)-0.5, length(a.xz)-0.5, length(a.yw)-0.5, length(a.zw)-0.5); }`,
    bodyTimed: `vec4 circleA(vec4 a) { float r=0.5+sin(iTime*0.2)*0.15; return vec4(length(a.xy)-r, length(a.xz)-r, length(a.yw)-r, length(a.zw)-r); }`,
  },
  {
    name: 'rippleA',
    always: false,
    usesTime: true,
    body: `vec4 rippleA(vec4 a) { return vec4(sin(length(a.xy)*20.)*0.5+0.5); }`,
    bodyTimed: `vec4 rippleA(vec4 a) { return vec4(sin(length(a.xy)*20.-iTime*2.)*0.5+0.5); }`,
  },

  // ── Palette helpers (always included when usePalette is set) ─────────────
  {
    name: 'CosinePalette',
    always: false, // emitted conditionally by GetCode based on usePalette
    usesTime: false,
    body:      `vec3 CosinePalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b*cos(6.28318*(c*t+d)); }`,
    // iTime slowly cycles the phase offset d, making colors drift over time
    bodyTimed: `vec3 CosinePalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b*cos(6.28318*(c*t+d+iTime*0.04)); }`,
  },
  {
    name: 'SmoothHSV',
    always: false, // emitted conditionally by GetCode based on !usePalette
    usesTime: false,
    body:      `vec3 SmoothHSV(vec3 c) { vec3 rgb=clamp(abs(mod(c.x*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.); return c.z*mix(vec3(1),rgb*rgb*(3.-2.*rgb),c.y); }`,
    // iTime slowly rotates the hue
    bodyTimed: `vec3 SmoothHSV(vec3 c) { c.x+=iTime*0.03; vec3 rgb=clamp(abs(mod(c.x*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.); return c.z*mix(vec3(1),rgb*rgb*(3.-2.*rgb),c.y); }`,
  },
];

/**
 * Names of all lib functions that ShaderStatement may randomly select.
 * Built automatically from SHADER_LIB_FUNCTIONS so the two stay in sync.
 * Excludes palette/color helpers (CosinePalette, SmoothHSV) which are never
 * used as statement function names.
 */
const _PALETTE_NAMES = new Set(['CosinePalette', 'SmoothHSV']);
export const SHADER_LIB_NAMES = SHADER_LIB_FUNCTIONS
  .filter(f => !_PALETTE_NAMES.has(f.name))
  .map(f => f.name);

/**
 * Build a Set of function names used by the given array of ShaderStatements
 * so GetCode() knows which helpers to emit.
 */
export function collectUsedLibNames(statements) {
  const used = new Set();
  for (const stmt of statements) {
    if (stmt.functionName) used.add(stmt.functionName);
  }
  return used;
}

/**
 * Emit the GLSL preamble for a shader.
 *
 * @param {Set<string>}  usedNames       – names from collectUsedLibNames()
 * @param {boolean}      usePalette      – whether to emit CosinePalette
 * @param {boolean}      useTimeInLib    – prefer timed function bodies
 * @returns {string}  Multi-line GLSL source ending with a blank line.
 */
export function buildPreamble(usedNames, usePalette, useTimeInLib) {
  let out = `const float PI = 3.141592653589793;\n`;

  for (const fn of SHADER_LIB_FUNCTIONS) {
    // Skip palette helpers – handled separately below
    if (fn.name === 'CosinePalette' || fn.name === 'SmoothHSV') continue;

    if (!usedNames.has(fn.name)) continue;

    const body = (useTimeInLib && fn.bodyTimed) ? fn.bodyTimed : fn.body;
    out += body + '\n';
  }

  // Palette / color-space helper (always exactly one of the two)
  if (usePalette) {
    const fn = SHADER_LIB_FUNCTIONS.find(f => f.name === 'CosinePalette');
    out += ((useTimeInLib && fn.bodyTimed) ? fn.bodyTimed : fn.body) + '\n';
  } else {
    const fn = SHADER_LIB_FUNCTIONS.find(f => f.name === 'SmoothHSV');
    out += ((useTimeInLib && fn.bodyTimed) ? fn.bodyTimed : fn.body) + '\n';
  }

  out += '\n';
  return out;
}
