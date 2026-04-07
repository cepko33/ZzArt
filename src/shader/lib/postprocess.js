/**
 * PostProcess GLSL filters for ZzArt.
 * These functions operate on vec4 colors and sometimes UVs.
 * Each filter provides a (vec4, float) signature for manual control
 * and a (vec4) signature for the genetic generator.
 */
export const POSTPROCESS_FUNCTIONS = [
    {
        name: 'FilterInverse',
        body: `
      vec4 FilterInverse(vec4 c, float amount) { return vec4(mix(c.xyz, 1.0 - c.xyz, amount), c.w); }
      vec4 FilterInverse(vec4 c) { return FilterInverse(c, 1.0); }
    `,
    },
    {
        name: 'FilterGrayscale',
        body: `
      vec4 FilterGrayscale(vec4 c, float amount) {
        float l = dot(c.xyz, vec3(0.299, 0.587, 0.114));
        return vec4(mix(c.xyz, vec3(l), amount), c.w);
      }
      vec4 FilterGrayscale(vec4 c) { return FilterGrayscale(c, 1.0); }
    `,
    },
    {
        name: 'FilterSepia',
        body: `
      vec4 FilterSepia(vec4 c, float amount) {
        vec3 s = vec3(
          dot(c.xyz, vec3(0.393, 0.769, 0.189)),
          dot(c.xyz, vec3(0.349, 0.686, 0.168)),
          dot(c.xyz, vec3(0.272, 0.534, 0.131))
        );
        return vec4(mix(c.xyz, s, amount), c.w);
      }
      vec4 FilterSepia(vec4 c) { return FilterSepia(c, 1.0); }
    `,
    },
    {
        name: 'FilterPosterize',
        body: `
      vec4 FilterPosterize(vec4 c, float levels) {
        if (levels < 1.0) return c;
        return vec4(floor(c.xyz * levels + 0.5) / levels, c.w);
      }
      vec4 FilterPosterize(vec4 c) { return FilterPosterize(c, 4.0); }
    `,
    },
    {
        name: 'FilterSolarize',
        body: `
      vec4 FilterSolarize(vec4 c, float threshold) {
        vec3 s = vec3(
          c.r > threshold ? 1.0 - c.r : c.r,
          c.g > threshold ? 1.0 - c.g : c.g,
          c.b > threshold ? 1.0 - c.b : c.b
        );
        return vec4(s, c.w);
      }
      vec4 FilterSolarize(vec4 c) { return FilterSolarize(c, 0.5); }
    `,
    },
    {
        name: 'FilterThreshold',
        body: `
      vec4 FilterThreshold(vec4 c, float threshold) {
        float l = dot(c.xyz, vec3(0.299, 0.587, 0.114));
        return vec4(vec3(step(threshold, l)), c.w);
      }
      vec4 FilterThreshold(vec4 c) { return FilterThreshold(c, 0.5); }
    `,
    },
    {
        name: 'FilterVignette',
        body: `
      vec4 FilterVignette(vec4 c, vec2 uv, float radius, float softness) {
        float d = length(uv - 0.5);
        float v = smoothstep(radius, radius - softness, d);
        return vec4(c.xyz * v, c.w);
      }
      vec4 FilterVignette(vec4 c) { return FilterVignette(c, vec2(0.5), 0.7, 0.3); }
    `,
    },
    {
        name: 'FilterScanlines',
        body: `
      vec4 FilterScanlines(vec4 c, vec2 uv, float freq, float amount) {
        float s = sin(uv.y * freq);
        return vec4(c.xyz * (1.0 - amount * abs(s)), c.w);
      }
      vec4 FilterScanlines(vec4 c) { return FilterScanlines(c, vec2(0.0), 200.0, 0.2); }
    `,
    },
    {
        name: 'FilterDither',
        body: `
      float DitherValue(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      vec4 FilterDither(vec4 c, vec2 uv, float amount) {
        float d = DitherValue(uv * 100.0); // Use arbitrary scale for generator
        return vec4(c.xyz + (d - 0.5) * amount, c.w);
      }
      vec4 FilterDither(vec4 c) { return FilterDither(c, vec2(0.0), 0.05); }
    `,
    },
    {
        name: 'FilterHueShift',
        body: `
      vec4 FilterHueShift(vec4 c, float shift) {
        vec3 k = vec3(0.57735, 0.57735, 0.57735);
        float cosAngle = cos(shift * 6.28318);
        vec3 r = c.xyz * cosAngle + cross(k, c.xyz) * sin(shift * 6.28318) + k * dot(k, c.xyz) * (1.0 - cosAngle);
        return vec4(r, c.w);
      }
      vec4 FilterHueShift(vec4 c) { return FilterHueShift(c, 0.1); }
    `,
    },
    {
        name: 'FilterSaturation',
        body: `
      vec4 FilterSaturation(vec4 c, float amount) {
        float l = dot(c.xyz, vec3(0.299, 0.587, 0.114));
        return vec4(mix(vec3(l), c.xyz, amount), c.w);
      }
      vec4 FilterSaturation(vec4 c) { return FilterSaturation(c, 1.5); }
    `,
    },
    {
        name: 'FilterContrast',
        body: `
      vec4 FilterContrast(vec4 c, float amount) {
        return vec4((c.xyz - 0.5) * amount + 0.5, c.w);
      }
      vec4 FilterContrast(vec4 c) { return FilterContrast(c, 1.2); }
    `,
    },
    {
        name: 'FilterBrightness',
        body: `
      vec4 FilterBrightness(vec4 c, float amount) {
        return vec4(c.xyz + amount, c.w);
      }
      vec4 FilterBrightness(vec4 c) { return FilterBrightness(c, 0.1); }
    `,
    },
    {
        name: 'FilterGamma',
        body: `
      vec4 FilterGamma(vec4 c, float gamma) {
        return vec4(pow(max(c.xyz, 0.0), vec3(1.0 / max(gamma, 0.01))), c.w);
      }
      vec4 FilterGamma(vec4 c) { return FilterGamma(c, 1.2); }
    `,
    },
    {
        name: 'FilterExposure',
        body: `
      vec4 FilterExposure(vec4 c, float exposure) {
        return vec4(c.xyz * pow(2.0, exposure), c.w);
      }
      vec4 FilterExposure(vec4 c) { return FilterExposure(c, 0.5); }
    `,
    },
    {
        name: 'FilterColorBalance',
        body: `
      vec4 FilterColorBalance(vec4 c, vec3 rgb) {
        return vec4(c.xyz * rgb, c.w);
      }
      vec4 FilterColorBalance(vec4 c) { return FilterColorBalance(c, vec3(1.1, 1.0, 0.9)); }
    `,
    },
    {
        name: 'FilterChromaticAberration',
        body: `
      vec4 FilterChromaticAberration(vec4 c, sampler2D tex, vec2 uv, float strength) {
        float r = texture2D(tex, uv + vec2(strength * 0.01, 0.0)).r;
        float g = texture2D(tex, uv).g;
        float b = texture2D(tex, uv - vec2(strength * 0.01, 0.0)).b;
        return vec4(r, g, b, c.w);
      }
      vec4 FilterChromaticAberration(vec4 c) { return c; }
    `,
    },
    {
        name: 'FilterPixelate',
        body: `
      vec4 FilterPixelate(vec4 c, sampler2D tex, vec2 uv, float size) {
        if (size <= 1.0) return c;
        vec2 p = floor(uv * iResolution.xy / size) * size / iResolution.xy;
        return texture2D(tex, p);
      }
      vec4 FilterPixelate(vec4 c) { return c; }
    `,
    },
    {
        name: 'FilterBloom',
        body: `
      vec4 FilterBloom(vec4 c, float threshold, float strength) {
        float l = dot(c.xyz, vec3(0.299, 0.587, 0.114));
        vec3 glow = max(c.xyz - threshold, 0.0) * strength;
        return vec4(c.xyz + glow, c.w);
      }
      vec4 FilterBloom(vec4 c) { return FilterBloom(c, 0.6, 0.5); }
    `,
    },
    {
        name: 'FilterFilmGrain',
        body: `
      float GrainNoise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233) + iTime * 0.01)) * 43758.5453);
      }
      vec4 FilterFilmGrain(vec4 c, vec2 uv, float intensity) {
        float n = GrainNoise(uv);
        return vec4(c.xyz + (n - 0.5) * intensity, c.w);
      }
      vec4 FilterFilmGrain(vec4 c) { return FilterFilmGrain(c, vec2(0.0), 0.1); }
    `,
    },
    {
        name: 'FilterEdgeDetection',
        body: `
      vec4 FilterEdgeDetection(vec4 c, sampler2D tex, vec2 uv, float strength) {
        vec2 d = 1.0 / iResolution.xy;
        float l = dot(texture2D(tex, uv).rgb, vec3(0.299, 0.587, 0.114));
        float r = dot(texture2D(tex, uv + vec2(d.x, 0)).rgb, vec3(0.299, 0.587, 0.114));
        float b = dot(texture2D(tex, uv + vec2(0, d.y)).rgb, vec3(0.299, 0.587, 0.114));
        float e = (abs(l - r) + abs(l - b)) * strength;
        return vec4(vec3(e), c.w);
      }
      vec4 FilterEdgeDetection(vec4 c) { return c; }
    `,
    },
    {
        name: 'FilterCRT',
        body: `
      vec4 FilterCRT(vec4 c, vec2 uv, float bend, float scanline) {
        vec2 u = uv * 2.0 - 1.0;
        u *= 1.0 + pow(length(u) * bend, 2.0);
        u = (u + 1.0) * 0.5;
        if (u.x < 0.0 || u.x > 1.0 || u.y < 0.0 || u.y > 1.0) return vec4(0.0, 0.0, 0.0, c.w);
        float s = sin(u.y * iResolution.y * 1.5) * scanline;
        return vec4(c.xyz * (1.0 - s), c.w);
      }
      vec4 FilterCRT(vec4 c) { return FilterCRT(c, vec2(0.5), 0.1, 0.2); }
    `,
    },
    {
        name: 'FilterGlitch',
        body: `
      vec4 FilterGlitch(vec4 c, sampler2D tex, vec2 uv, float intensity) {
        float n = fract(sin(floor(iTime * 10.0) * 123.456) * 789.012);
        if (n > intensity) return c;
        float offset = (n - 0.5) * 0.1;
        return texture2D(tex, uv + vec2(offset, 0.0));
      }
      vec4 FilterGlitch(vec4 c) { return c; }
    `,
    },
    {
        name: 'FilterTiltShift',
        body: `
      vec4 FilterTiltShift(vec4 c, float center, float width, float strength) {
        float d = abs(gl_FragCoord.y / iResolution.y - center);
        float f = smoothstep(width, width + 0.2, d) * strength;
        return vec4(mix(c.xyz, vec3(dot(c.xyz, vec3(0.333))), f), c.w);
      }
      vec4 FilterTiltShift(vec4 c) { return FilterTiltShift(c, 0.5, 0.2, 0.5); }
    `,
    },
    {
        name: 'FilterRadialBlur',
        body: `
      vec4 FilterRadialBlur(vec4 c, sampler2D tex, vec2 uv, float strength) {
        vec4 r = vec4(0.0);
        vec2 dir = 0.5 - uv;
        for (int i=0; i<8; i++) {
          r += texture2D(tex, uv + dir * float(i) * 0.01 * strength);
        }
        return r / 8.0;
      }
      vec4 FilterRadialBlur(vec4 c) { return c; }
    `,
    },
    {
        name: 'FilterHalftone',
        body: `
      vec4 FilterHalftone(vec4 c, vec2 uv, float size) {
        float freq = iResolution.x / size;
        float d = distance(fract(uv * freq), vec2(0.5));
        float l = dot(c.xyz, vec3(0.299, 0.587, 0.114));
        return vec4(vec3(step(d, l * 0.6)), c.w);
      }
      vec4 FilterHalftone(vec4 c) { return FilterHalftone(c, vec2(0.0), 10.0); }
    `,
    },
    {
        name: 'FilterKaleidoscope',
        body: `
      vec4 FilterKaleidoscope(vec4 c, sampler2D tex, vec2 uv, float segments) {
        vec2 p = uv - 0.5;
        float r = length(p);
        float a = atan(p.y, p.x);
        float seg = 6.28318 / max(segments, 1.0);
        a = mod(a, seg);
        if (a > seg * 0.5) a = seg - a;
        return texture2D(tex, vec2(cos(a), sin(a)) * r + 0.5);
      }
      vec4 FilterKaleidoscope(vec4 c) { return c; }
    `,
    },
    {
        name: 'FilterMirror',
        body: `
      vec4 FilterMirror(vec4 c, sampler2D tex, vec2 uv, float axis) {
        vec2 p = uv;
        if (axis < 0.5) { if (p.x > 0.5) p.x = 1.0 - p.x; }
        else { if (p.y > 0.5) p.y = 1.0 - p.y; }
        return texture2D(tex, p);
      }
      vec4 FilterMirror(vec4 c) { return c; }
    `,
    },
    {
        name: 'FilterSharpen',
        body: `
      vec4 FilterSharpen(vec4 c, sampler2D tex, vec2 uv, float strength) {
        vec2 d = 1.0 / iResolution.xy;
        vec4 n = texture2D(tex, uv + vec2(0, d.y)) + texture2D(tex, uv - vec2(0, d.y)) +
                 texture2D(tex, uv + vec2(d.x, 0)) + texture2D(tex, uv - vec2(d.x, 0));
        return vec4(c.xyz + (c.xyz - n.xyz * 0.25) * strength * 4.0, c.w);
      }
      vec4 FilterSharpen(vec4 c) { return c; }
    `,
    },
    {
        name: 'FilterBlur',
        body: `
      vec4 FilterBlur(vec4 c, sampler2D tex, vec2 uv, float radius) {
        vec2 d = radius / iResolution.xy;
        vec4 r = texture2D(tex, uv + d) + texture2D(tex, uv - d) +
                 texture2D(tex, uv + vec2(d.x, -d.y)) + texture2D(tex, uv - vec2(d.x, d.y));
        return r * 0.25;
      }
      vec4 FilterBlur(vec4 c) { return c; }
    `,
    },
    {
        name: 'FilterNightVision',
        body: `
      vec4 FilterNightVision(vec4 c, vec2 uv, float intensity) {
        float l = dot(c.xyz, vec3(0.299, 0.587, 0.114));
        float n = fract(sin(dot(uv, vec2(12.9898, 78.233) + iTime)) * 43758.5453);
        vec3 g = vec3(0.1, 0.8, 0.2) * (l + n * 0.2) * intensity;
        return vec4(mix(c.xyz, g, intensity), c.w);
      }
      vec4 FilterNightVision(vec4 c) { return FilterNightVision(c, vec2(0.0), 0.8); }
    `,
    },
    {
        name: 'FilterThermal',
        body: `
      vec4 FilterThermal(vec4 c) {
        float l = dot(c.xyz, vec3(0.299, 0.587, 0.114));
        vec3 t = mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0), smoothstep(0.0, 0.33, l));
        t = mix(t, vec3(1.0, 1.0, 0.0), smoothstep(0.33, 0.66, l));
        t = mix(t, vec3(1.0, 0.0, 0.0), smoothstep(0.66, 1.0, l));
        return vec4(t, c.w);
      }
    `,
    },
    {
        name: 'FilterDuotone',
        body: `
      vec4 FilterDuotone(vec4 c, vec3 col1, vec3 col2) {
        float l = dot(c.xyz, vec3(0.299, 0.587, 0.114));
        return vec4(mix(col1, col2, l), c.w);
      }
      vec4 FilterDuotone(vec4 c) { return FilterDuotone(c, vec3(0.1, 0.0, 0.2), vec3(1.0, 0.9, 0.5)); }
    `,
    },
    {
        name: 'FilterRGBShift',
        body: `
      vec4 FilterRGBShift(vec4 c, sampler2D tex, vec2 uv, vec2 offset) {
        return vec4(
          texture2D(tex, uv + offset).r,
          texture2D(tex, uv).g,
          texture2D(tex, uv - offset).b,
          c.w
        );
      }
      vec4 FilterRGBShift(vec4 c) { return c; }
    `,
    },
    {
        name: 'FilterTechnicolor',
        body: `
      vec4 FilterTechnicolor(vec4 c) {
        vec3 r = c.xyz * vec3(1.0, 0.0, 0.0);
        vec3 g = c.xyz * vec3(0.0, 1.0, 0.0);
        vec3 b = c.xyz * vec3(0.0, 0.0, 1.0);
        return vec4(r.r, g.g, b.b, c.w);
      }
    `,
    },
    {
        name: 'FilterBleachBypass',
        body: `
      vec4 FilterBleachBypass(vec4 c, float amount) {
        float l = dot(c.xyz, vec3(0.299, 0.587, 0.114));
        vec3 r = mix(c.xyz, vec3(l), amount);
        vec3 res = mix(2.0 * c.xyz * r, 1.0 - 2.0 * (1.0 - c.xyz) * (1.0 - r), step(0.5, l));
        return vec4(mix(c.xyz, res, amount), c.w);
      }
      vec4 FilterBleachBypass(vec4 c) { return FilterBleachBypass(c, 0.5); }
    `,
    },
    {
        name: 'FilterLomo',
        body: `
      vec4 FilterLomo(vec4 c, vec2 uv) {
        vec3 r = c.xyz * 1.2;
        r = pow(max(r, 0.0), vec3(1.2));
        float d = length(uv - 0.5);
        r *= smoothstep(0.8, 0.4, d);
        return vec4(r, c.w);
      }
      vec4 FilterLomo(vec4 c) { return FilterLomo(c, vec2(0.5)); }
    `,
    },
];
