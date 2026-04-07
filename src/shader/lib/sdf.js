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
    {
        name: 'circle',
        isUtility: true,
        body: `float circle(vec2 st, float radius){
    vec2 pos = vec2(0.5)-st;
    radius *= 0.75;
    return 1.-smoothstep(radius-(radius*0.05),radius+(radius*0.05),dot(pos,pos)*3.14);
}`,
    },
    {
        name: 'circlePattern',
        isUtility: true,
        body: `float circlePattern(vec2 st, float radius) {
    return  circle(st+vec2(0.,-.5), radius)+
            circle(st+vec2(0.,.5), radius)+
            circle(st+vec2(-.5,0.), radius)+
            circle(st+vec2(.5,0.), radius);
}`,
    },
    {
        name: 'circleShapeA',
        isUtility: false,
        body: `vec4 circleShapeA(vec4 a) { return vec4(circle(a.xy, a.z)); }`,
        weight: 1.0,
    },
    {
        name: 'circlePatternA',
        isUtility: false,
        body: `vec4 circlePatternA(vec4 a) { return vec4(circlePattern(a.xy, a.z)); }`,
        weight: 0.8,
    },
];
