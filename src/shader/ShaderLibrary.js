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

// ── Inline Clamp used only within this module ─────────────────────────────
function _clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/**
 * Build the hardcoded composite fragment shader for the feedback pass.
 *
 * blendMode, maskType, modType, and opOrder are all inlined as literal GLSL
 * — no runtime branches — so GPU workload is minimal.
 *
 * @param {number} blendMode  0–7   blend operation for current vs previous
 * @param {number} maskType   0–4   spatially-varying alpha mask source
 * @param {number} modType    0–4   UV modulation applied to iPrevious sample:
 *                                    0 None, 1 Distort, 2 Displace-noise,
 *                                    3 Scale, 4 Rotate
 * @param {number} opOrder    0–5   how mask and modulation are cross-wired:
 *                                    0 Standard   – mod UV → sample → mask(curr) → blend
 *                                    1 Mask-gate  – mask(curr) first → scales mod_a → mod UV → blend
 *                                    2 Inv-gate   – (1-mask) scales mod_a → stronger in dark areas
 *                                    3 Warp-then-mask – mod UV → sample warped → mask(curr,prevW) → blend
 *                                    4 Mask-steers-UV – mask drives UV offset direction (attraction)
 *                                    5 Mod-vs-amount  – mod_a trades off against iFeedbackAmount
 * @param {number} width      canvas pixel width  (baked into iResolution)
 * @param {number} height     canvas pixel height
 * @returns {string}  Complete GLSL source for the composite fragment shader
 */
export function buildCompositeShader(blendMode, maskType, modType, opOrder, sharpen, blur, width, height) {

  // ... (blendExprs, maskExprs, modKernels, opBodies remain same) ...
  // (I'll just replace the whole function in the next call or keep it concise)

  // ── Blend sub-expression (uses curr, prev, alpha already declared) ────────
  const blendExprs = [
    /* 0 Mix        */ `mix(curr, prev, alpha)`,
    /* 1 Additive   */ `clamp(prev * alpha + curr, 0., 1.)`,
    /* 2 Multiply   */ `clamp(prev * curr + curr * (1. - alpha), 0., 1.)`,
    /* 3 Screen     */ `clamp(1. - (1. - prev) * (1. - curr) * alpha, 0., 1.)`,
    /* 4 Difference */ `clamp(abs(prev - curr) * alpha + curr * (1. - alpha), 0., 1.)`,
    /* 5 Lighten    */ `clamp(max(prev, curr) * alpha + curr * (1. - alpha), 0., 1.)`,
    /* 6 Darken     */ `clamp(min(prev, curr) * alpha + curr * (1. - alpha), 0., 1.)`,
    /* 7 Burn       */ `clamp(1. - (1. - prev * alpha) / (curr + 0.001), 0., 1.)`,
    /* 8 Atop       */ `clamp(curr + prev * (1.0 - dot(curr.rgb, vec3(0.299,0.587,0.114))) * alpha, 0., 1.)`,
  ];
  const blendExpr = blendExprs[_clamp(blendMode, 0, blendExprs.length - 1)];

  // ── Mask sub-expression ────────────────────────────────────────────────────
  // Requires curr and prev already declared. Edge mask needs dx/dy.
  const maskExprs = [
    /* 0 None      */ `1.0`,
    /* 1 Luminance */ `dot(curr.rgb, vec3(0.299, 0.587, 0.114))`,
    /* 2 Red ch.   */ `curr.r`,
    /* 3 Edge      */ `clamp((abs(texture2D(iCurrent,uv+vec2(dx,0.)).r-texture2D(iCurrent,uv-vec2(dx,0.)).r)+abs(texture2D(iCurrent,uv+vec2(0.,dy)).r-texture2D(iCurrent,uv-vec2(0.,dy)).r))*8.0,0.,1.)`,
    /* 4 Hue dist  */ `clamp(distance(curr.rgb, prev.rgb) * 3.0, 0., 1.)`,
    /* 5 Alpha     */ `curr.a`,
    /* 6 Chroma    */ `calcChroma(curr.rgb, iChromaKeyColor, iChromaThreshold, iChromaSoftness, iChromaMode)`,
  ];
  const maskExpr = maskExprs[_clamp(maskType, 0, maskExprs.length - 1)];

  // ── UV modulation kernel (outputs `uvp`, reads `mod_a`, `uv`, `iTime`) ────
  // We use a function-like template so each opOrder can adjust mod_a first.
  const modKernels = [
    /* 0 None     */ (m) => `vec2 uvp = uv;`,
    /* 1 Distort  */ (m) => `vec2 uvp = uv + sin(uv.yx*6.2831853+iTime*0.5)*${m}*0.04;`,
    /* 2 Displace */ (m) => `vec2 _h=fract(sin(vec2(dot(uv,vec2(127.1,311.7)),dot(uv,vec2(269.5,183.3))))*43758.547);\n  vec2 uvp=uv+(_h-0.5)*${m}*0.06;`,
    /* 3 Scale    */ (m) => `vec2 uvp=(uv-0.5)*(1.0-${m}*0.03)+0.5;`,
    /* 4 Rotate   */ (m) => `float _ang=${m}*0.06;float _s=sin(_ang),_c=cos(_ang);vec2 _off=uv-0.5;\n  vec2 uvp=vec2(_c*_off.x-_s*_off.y,_s*_off.x+_c*_off.y)+0.5;`,
  ];
  const mk = modKernels[_clamp(modType, 0, modKernels.length - 1)];

  // ── Operation-order bodies ─────────────────────────────────────────────────
  // Each produces a complete void main(){…} body (no uniforms, just code).
  // Variables available at entry: uv, dx, dy, mod_a (= iFeedbackModAmount).
  const opBodies = [

    /* 0 Standard: mod UV → sample → mask(curr) → blend */
    `  ${mk('mod_a')}
  vec4 curr = texture2D(iCurrent, uv);
  vec4 prev = texture2D(iPrevious, clamp(uvp,0.,1.));
  float mask = ${maskExpr};
  float alpha = iFeedbackAmount * mask;
  gl_FragColor = ${blendExpr};`,

    /* 1 Mask-gate: mask(curr) first → gates mod_a → mod UV → sample → blend */
    `  vec4 curr = texture2D(iCurrent, uv);
  vec4 prev0 = texture2D(iPrevious, uv);  // temp prev at plain uv for mask
  float mask0 = ${maskExpr.replace(/\bprev\b/g,'prev0')};
  float gated_a = mod_a * mask0;
  ${mk('gated_a')}
  vec4 prev = texture2D(iPrevious, clamp(uvp,0.,1.));
  float mask = mask0;
  float alpha = iFeedbackAmount * mask;
  gl_FragColor = ${blendExpr};`,

    /* 2 Inv-gate: (1-mask) gates mod_a → stronger warping in dark/low areas */
    `  vec4 curr = texture2D(iCurrent, uv);
  vec4 prev0 = texture2D(iPrevious, uv);
  float mask0 = ${maskExpr.replace(/\bprev\b/g,'prev0')};
  float inv_a = mod_a * (1.0 - mask0);
  ${mk('inv_a')}
  vec4 prev = texture2D(iPrevious, clamp(uvp,0.,1.));
  float mask = mask0;
  float alpha = iFeedbackAmount * mask;
  gl_FragColor = ${blendExpr};`,

    /* 3 Warp-then-mask: mod UV → sample warped prev → mask compares curr vs warped prev */
    `  ${mk('mod_a')}
  vec4 curr = texture2D(iCurrent, uv);
  vec4 prev = texture2D(iPrevious, clamp(uvp,0.,1.));
  // mask uses warped prev (hue dist now measures warp displacement)
  float mask = ${maskExpr};
  float alpha = iFeedbackAmount * mask;
  gl_FragColor = ${blendExpr};`,

    /* 4 Mask-steers-UV: mask from curr biases the UV warp direction toward bright pixels */
    `  vec4 curr = texture2D(iCurrent, uv);
  // Sample neighbours to estimate gradient of curr brightness
  float lx = dot(texture2D(iCurrent,uv+vec2(dx,0.)).rgb,vec3(.299,.587,.114));
  float rx = dot(texture2D(iCurrent,uv-vec2(dx,0.)).rgb,vec3(.299,.587,.114));
  float ly = dot(texture2D(iCurrent,uv+vec2(0.,dy)).rgb,vec3(.299,.587,.114));
  float ry = dot(texture2D(iCurrent,uv-vec2(0.,dy)).rgb,vec3(.299,.587,.114));
  vec2 grad = vec2(lx-rx, ly-ry) * mod_a * 0.05;
  vec2 uvg = uv + grad;  // gradient-steered base UV
  ${mk('mod_a').replace(/\buv\b/g,'uvg').replace('uvg.yx','uv.yx')}
  vec4 prev = texture2D(iPrevious, clamp(uvp,0.,1.));
  float mask = ${maskExpr};
  float alpha = iFeedbackAmount * mask;
  gl_FragColor = ${blendExpr};`,

    /* 5 Mod-vs-amount: mod_a and iFeedbackAmount trade off (their product stays ~constant) */
    `  // higher mod_a → more UV warp, less blend amount, and vice versa
  float traded_blend = iFeedbackAmount * (1.0 - mod_a * 0.5);
  float traded_mod   = mod_a * (1.0 + iFeedbackAmount * 0.5);
  ${mk('traded_mod')}
  vec4 curr = texture2D(iCurrent, uv);
  vec4 prev = texture2D(iPrevious, clamp(uvp,0.,1.));
  float mask = ${maskExpr};
  float alpha = traded_blend * mask;
  gl_FragColor = ${blendExpr};`,
  ];

  const body = opBodies[_clamp(opOrder, 0, opBodies.length - 1)];

  return `precision mediump float;
uniform sampler2D iCurrent;
uniform sampler2D iPrevious;
uniform float iFeedbackAmount;
uniform float iFeedbackModAmount;
uniform float iTime;
uniform vec3  iChromaKeyColor;
uniform float iChromaThreshold;
uniform float iChromaSoftness;
uniform int   iChromaMode;

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

float calcChroma(vec3 col, vec3 key, float threshold, float softness, int mode) {
  float d = 0.0;
  if (mode == 0) {
    d = distance(col, key);
  } else {
    vec3 hsv = rgb2hsv(col);
    vec3 keyHsv = rgb2hsv(key);
    if (mode == 1) {
      d = abs(hsv.x - keyHsv.x);
      if (d > 0.5) d = 1.0 - d;
      d *= 2.0; // scale to 0-1 range for distance
    } else if (mode == 2) {
      d = abs(hsv.y - keyHsv.y);
    } else if (mode == 3) {
      d = abs(hsv.z - keyHsv.z);
    }
  }
  return smoothstep(threshold, threshold + softness, d);
}

void main(){
  vec2 uv = gl_FragCoord.xy / vec2(${width}.0, ${height}.0);
  float dx = 1.0 / ${width}.0;
  float dy = 1.0 / ${height}.0;
  float mod_a = iFeedbackModAmount;
${body}
  
  // Post-processing sharp/blur (applied to current history sample for stability)
  if (${sharpen.toFixed(3)} > 0.0 || ${blur.toFixed(3)} > 0.0) {
      vec4 r = gl_FragColor;
      vec2 d = vec2(dx, dy);
      
      // sample neighbors from iPrevious (since we can't sample the 'current' result)
      // This effectively sharpens the cumulative history result over time.
      vec4 n = texture2D(iPrevious, clamp(uvp + vec2(0, d.y), 0., 1.)) + 
               texture2D(iPrevious, clamp(uvp - vec2(0, d.y), 0., 1.)) + 
               texture2D(iPrevious, clamp(uvp + vec2(d.x, 0), 0., 1.)) + 
               texture2D(iPrevious, clamp(uvp - vec2(d.x, 0), 0., 1.));
      
      r.rgb += (r.rgb - n.rgb * 0.25) * ${sharpen.toFixed(3)} * 4.0;
      
      vec4 b = texture2D(iPrevious, clamp(uvp + d, 0., 1.)) + 
               texture2D(iPrevious, clamp(uvp - d, 0., 1.)) + 
               texture2D(iPrevious, clamp(uvp + vec2(d.x, -d.y), 0., 1.)) + 
               texture2D(iPrevious, clamp(uvp - vec2(d.x, d.y), 0., 1.));
               
      r.rgb = mix(r.rgb, b.rgb * 0.25, ${blur.toFixed(3)});
      gl_FragColor = r;
  }
}`;
}


