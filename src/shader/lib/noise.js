export const NOISE_FUNCTIONS = [
  {
    name: 'hashA',
    always: false,
    usesTime: true,
    body: `vec4 hashA(vec4 a) { return fract(sin(a*127.1+vec4(311.7,74.7,547.3,233.1))*43758.547); }`,
    bodyTimed: `vec4 hashA(vec4 a) { return fract(sin((a+iTime*0.001)*127.1+vec4(311.7,74.7,547.3,233.1))*43758.547); }`,
  },
  {
    name: 'noiseA',
    always: false,
    usesTime: true,
    body: `vec4 noiseA(vec4 a) { vec4 i=floor(a); vec4 f=fract(a); f=f*f*(3.-2.*f); vec4 h=fract(sin(i*127.1+vec4(311.7,74.7,547.3,233.1))*43758.547); vec4 h2=fract(sin((i+1.)*127.1+vec4(311.7,74.7,547.3,233.1))*43758.547); return mix(h,h2,f); }`,
    bodyTimed: `vec4 noiseA(vec4 a) { vec4 at=a+iTime*0.05; vec4 i=floor(at); vec4 f=fract(at); f=f*f*(3.-2.*f); vec4 h=fract(sin(i*127.1+vec4(311.7,74.7,547.3,233.1))*43758.547); vec4 h2=fract(sin((i+1.)*127.1+vec4(311.7,74.7,547.3,233.1))*43758.547); return mix(h,h2,f); }`,
  },
];
