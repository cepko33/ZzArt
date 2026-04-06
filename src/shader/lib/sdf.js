export const SDF_FUNCTIONS = [
  {
    name: 'circleA',
    always: false,
    usesTime: true,
    body: `vec4 circleA(vec4 a) { return vec4(length(a.xy)-0.5, length(a.xz)-0.5, length(a.yw)-0.5, length(a.zw)-0.5); }`,
    bodyTimed: `vec4 circleA(vec4 a) { float r=0.5+sin(iTime*0.2)*0.15; return vec4(length(a.xy)-r, length(a.xz)-r, length(a.yw)-r, length(a.zw)-r); }`,
    weight: 1.2,
  },
  {
    name: 'rippleA',
    always: false,
    usesTime: true,
    body: `vec4 rippleA(vec4 a) { return vec4(sin(length(a.xy)*20.)*0.5+0.5); }`,
    bodyTimed: `vec4 rippleA(vec4 a) { return vec4(sin(length(a.xy)*20.-iTime*2.)*0.5+0.5); }`,
    weight: 1.5,
  },
];
