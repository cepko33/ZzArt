export const COLOR_FUNCTIONS = [
  {
    name: 'CosinePalette',
    always: false,
    usesTime: true,
    body:      `vec3 CosinePalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b*cos(6.28318*(c*t+d)); }`,
    bodyTimed: `vec3 CosinePalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b*cos(6.28318*(c*t+d+iTime*0.04)); }`,
  },
  {
    name: 'SmoothHSV',
    always: false,
    usesTime: true,
    body:      `vec3 SmoothHSV(vec3 c) { vec3 rgb=clamp(abs(mod(c.x*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.); return c.z*mix(vec3(1),rgb*rgb*(3.-2.*rgb),c.y); }`,
    bodyTimed: `vec3 SmoothHSV(vec3 c) { c.x+=iTime*0.03; vec3 rgb=clamp(abs(mod(c.x*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.); return c.z*mix(vec3(1),rgb*rgb*(3.-2.*rgb),c.y); }`,
  },
];
