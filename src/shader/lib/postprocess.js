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
];
