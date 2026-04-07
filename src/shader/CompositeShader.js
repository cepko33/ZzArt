/**
 * CompositeShader.js
 *
 * Handles the generation of the feedback/compositor fragment shader.
 * This is a multi-pass technique where the current frame is blended
 * with the previous frame's history, often with UV distortion.
 */

import { state } from '../state';

function _clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Build the hardcoded composite fragment shader for the feedback pass.
 *
 * @param {number} blendMode  0–8   blend operation for current vs previous
 * @param {number} maskType   0–6   spatially-varying alpha mask source
 * @param {number} modType    0–4   UV modulation applied to iPrevious sample
 * @param {number} opOrder    0–5   how mask and modulation are cross-wired
 * @param {number} sharpen    0-1   sharpen amount
 * @param {number} blur       0-1   blur amount
 * @param {Array}  preFilters Array of {name, params}
 * @param {number} width      canvas width
 * @param {number} height     canvas height
 * @returns {string}  Complete GLSL source for the composite fragment shader
 */
export function buildCompositeShader(
    blendMode,
    maskType,
    modType,
    opOrder,
    sharpen,
    blur,
    preFilters
) {
    const sNum = Number(sharpen) || 0;
    const bNum = Number(blur) || 0;

    const filterCode = buildFilterChain(preFilters || [], 'iCurrent');

    // ── Blend sub-expression (uses curr, prev, alpha already declared) ────────
    const blendExprs = [
        /* 0 Mix        */ `mix(curr, prev, alpha)`,
        /* 1 Additive   */ `clamp(prev * alpha + curr, 0., 1.)`,
        /* 2 Multiply   */ `clamp(prev * curr + curr * (1. - alpha), 0., 1.)`,
        /* 3 Screen     */ `1. - (1. - prev) * (1. - curr) * alpha`,
        /* 4 Difference */ `abs(prev - curr) * alpha + curr * (1. - alpha)`,
        /* 5 Lighten    */ `max(prev, curr) * alpha + curr * (1. - alpha)`,
        /* 6 Darken     */ `min(prev, curr) * alpha + curr * (1. - alpha)`,
        /* 7 Burn       */ `1. - (1. - prev * alpha) / (curr + 0.001)`,
        /* 8 Atop       */ `curr + prev * (1.0 - dot(curr.rgb, vec3(0.299,0.587,0.114))) * alpha`,
    ];
    const blendExpr = blendExprs[_clamp(blendMode, 0, blendExprs.length - 1)];

    // ── Mask sub-expression ────────────────────────────────────────────────────
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
    const modKernels = [
        /* 0 None     */ (m) => `vec2 uvp = uv;`,
        /* 1 Distort  */ (m) => `vec2 uvp = uv + sin(uv.yx*6.2831853+iTime*0.5)*${m}*0.04;`,
        /* 2 Displace */ (m) =>
            `vec2 _h=fract(sin(vec2(dot(uv,vec2(127.1,311.7)),dot(uv,vec2(269.5,183.3))))*43758.547);\n  vec2 uvp=uv+(_h-0.5)*${m}*0.06;`,
        /* 3 Scale    */ (m) => `vec2 uvp=(uv-0.5)*(1.0-${m}*0.03)+0.5;`,
        /* 4 Rotate   */ (m) =>
            `float _ang=${m}*0.06;float _s=sin(_ang),_c=cos(_ang);vec2 _off=uv-0.5;\n  vec2 uvp=vec2(_c*_off.x-_s*_off.y,_s*_off.x+_c*_off.y)+0.5;`,
    ];
    const mk = modKernels[_clamp(modType, 0, modKernels.length - 1)];

    // ── Operation-order bodies ─────────────────────────────────────────────────
    const opBodies = [
        /* 0 Standard: mod UV → sample → mask(curr) → blend */
        `  ${mk('mod_a')}
  vec4 curr = texture2D(iCurrent, uv);
  #ifdef PREPROCESS
  ${filterCode} // Applies to curr
  #endif
  vec4 prev = texture2D(iPrevious, clamp(uvp,0.,1.));
  float mask = ${maskExpr};
  float alpha = iFeedbackAmount * mask;
  gl_FragColor = ${blendExpr};`,

        /* 1 Mask-gate: mask(curr) first → gates mod_a → mod UV → sample → blend */
        `  vec4 curr = texture2D(iCurrent, uv);
  #ifdef PREPROCESS
  ${filterCode}
  #endif
  vec4 prev0 = texture2D(iPrevious, uv);
  float mask0 = ${maskExpr.replace(/\bprev\b/g, 'prev0')};
  float gated_a = mod_a * mask0;
  ${mk('gated_a')}
  vec4 prev = texture2D(iPrevious, clamp(uvp,0.,1.));
  float mask = mask0;
  float alpha = iFeedbackAmount * mask;
  gl_FragColor = ${blendExpr};`,

        /* 2 Inv-gate: (1-mask) gates mod_a → stronger warping in dark/low areas */
        `  vec4 curr = texture2D(iCurrent, uv);
  #ifdef PREPROCESS
  ${filterCode}
  #endif
  vec4 prev0 = texture2D(iPrevious, uv);
  float mask0 = ${maskExpr.replace(/\bprev\b/g, 'prev0')};
  float inv_a = mod_a * (1.0 - mask0);
  ${mk('inv_a')}
  vec4 prev = texture2D(iPrevious, clamp(uvp,0.,1.));
  float mask = mask0;
  float alpha = iFeedbackAmount * mask;
  gl_FragColor = ${blendExpr};`,

        /* 3 Warp-then-mask: mod UV → sample warped prev → mask compares curr vs warped prev */
        `  ${mk('mod_a')}
  vec4 curr = texture2D(iCurrent, uv);
  #ifdef PREPROCESS
  ${filterCode}
  #endif
  vec4 prev = texture2D(iPrevious, clamp(uvp,0.,1.));
  float mask = ${maskExpr};
  float alpha = iFeedbackAmount * mask;
  gl_FragColor = ${blendExpr};`,

        /* 4 Mask-steers-UV: mask from curr biases the UV warp direction toward bright pixels */
        `  vec4 curr = texture2D(iCurrent, uv);
  #ifdef PREPROCESS
  ${filterCode}
  #endif
  float lx = dot(texture2D(iCurrent,uv+vec2(dx,0.)).rgb,vec3(.299,.587,.114));
  float rx = dot(texture2D(iCurrent,uv-vec2(dx,0.)).rgb,vec3(.299,.587,.114));
  float ly = dot(texture2D(iCurrent,uv+vec2(0.,dy)).rgb,vec3(.299,.587,.114));
  float ry = dot(texture2D(iCurrent,uv-vec2(0.,dy)).rgb,vec3(.299,.587,.114));
  vec2 grad = vec2(lx-rx, ly-ry) * mod_a * 0.05;
  vec2 uvg = uv + grad;
  ${mk('mod_a')
      .replace(/\buv\b/g, 'uvg')
      .replace('uvg.yx', 'uv.yx')}
  vec4 prev = texture2D(iPrevious, clamp(uvp,0.,1.));
  float mask = ${maskExpr};
  float alpha = iFeedbackAmount * mask;
  gl_FragColor = ${blendExpr};`,

        /* 5 Mod-vs-amount: mod_a and iFeedbackAmount trade off */
        `  float traded_blend = iFeedbackAmount * (1.0 - mod_a * 0.5);
  float traded_mod   = mod_a * (1.0 + iFeedbackAmount * 0.5);
  ${mk('traded_mod')}
  vec4 curr = texture2D(iCurrent, uv);
  #ifdef PREPROCESS
  ${filterCode}
  #endif
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
uniform vec3  iResolution;

// Library functions injected here
${state.postProcessFunctions.map((f) => f.body).join('\n')}

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
      d *= 2.0;
    } else if (mode == 2) {
      d = abs(hsv.y - keyHsv.y);
    } else if (mode == 3) {
      d = abs(hsv.z - keyHsv.z);
    }
  }
  return smoothstep(threshold, threshold + softness, d);
}

void main(){
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float dx = 1.0 / iResolution.x;
  float dy = 1.0 / iResolution.y;
  float mod_a = iFeedbackModAmount;
${body}
  
  if (${sNum.toFixed(3)} > 0.0 || ${bNum.toFixed(3)} > 0.0) {
      vec4 r = gl_FragColor;
      vec2 d = vec2(dx, dy);
      vec4 n = texture2D(iPrevious, clamp(uvp + vec2(0, d.y), 0., 1.)) + 
               texture2D(iPrevious, clamp(uvp - vec2(0, d.y), 0., 1.)) + 
               texture2D(iPrevious, clamp(uvp + vec2(d.x, 0), 0., 1.)) + 
               texture2D(iPrevious, clamp(uvp - vec2(d.x, 0), 0., 1.));
      
      r.rgb += (r.rgb - n.rgb * 0.25) * ${sNum.toFixed(3)} * 4.0;
      
      vec4 b = texture2D(iPrevious, clamp(uvp + d, 0., 1.)) + 
               texture2D(iPrevious, clamp(uvp - d, 0., 1.)) + 
               texture2D(iPrevious, clamp(uvp + vec2(d.x, -d.y), 0., 1.)) + 
               texture2D(iPrevious, clamp(uvp - vec2(d.x, d.y), 0., 1.));
               
      r.rgb = mix(r.rgb, b.rgb * 0.25, ${bNum.toFixed(3)});
      gl_FragColor = r;
  }
}`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildFilterChain(filters, samplerName) {
    if (!filters || filters.length === 0) return '';
    let glsl = '';
    for (const f of filters) {
        const fdef = state.postProcessFunctions.find((pf) => pf.name === f.name);
        if (!fdef) continue;

        // Detect parameter signature from body (naive but effective for our library)
        const hasTexture = fdef.body.includes('sampler2D tex');
        const hasUV = fdef.body.includes('vec2 uv');

        let args = 'curr';
        if (hasTexture) args += ', ' + samplerName;
        if (hasUV) args += ', uv';

        // Add custom params
        for (const key in f.params) {
            const val = f.params[key];
            if (typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)))) {
                args += ', ' + parseFloat(val).toFixed(4);
            } else if (val && typeof val === 'object' && val.x !== undefined) {
                const vx = parseFloat(val.x) || 0;
                const vy = parseFloat(val.y) || 0;
                if (val.z !== undefined) {
                    const vz = parseFloat(val.z) || 0;
                    args += ', vec3(' + vx.toFixed(4) + ',' + vy.toFixed(4) + ',' + vz.toFixed(4) + ')';
                } else {
                    args += ', vec2(' + vx.toFixed(4) + ',' + vy.toFixed(4) + ')';
                }
            }
        }

        glsl += '  curr = ' + f.name + '(' + args + ');\n';
    }
    return '#define PREPROCESS\n' + glsl;
}

export function buildPostProcessShader(filters) {
    const filterCode = buildFilterChain(filters || [], 'iChannel0');
    return `precision mediump float;
uniform sampler2D iChannel0;
uniform float iTime;
uniform vec3 iResolution;

// Library functions injected here
${state.postProcessFunctions.map((f) => f.body).join('\n')}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  vec4 curr = texture2D(iChannel0, uv);
${filterCode}
  gl_FragColor = curr;
}`;
}
