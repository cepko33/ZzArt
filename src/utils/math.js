import { state } from '../state';

export function RandSeeded() {
    state.randSeed ^= state.randSeed << 13;
    state.randSeed ^= state.randSeed >> 7;
    state.randSeed ^= state.randSeed << 17;
    return Math.abs(state.randSeed);
}

export const Rand = (m = 1) => (m * RandInt(1e9)) / 1e9;
export const RandInt = (m) => RandSeeded() % m;
export const RandBetween = (a, b) => a + Rand(b - a);
export const RandIntBetween = (a, b) => a + RandInt(b - a + 1);

export const HashString = (string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i++) hash = ((hash << 5) - hash + string.charCodeAt(i)) | 0;
    return hash;
};

export const PI = Math.PI;
export const Min = (a, b) => (a < b ? a : b);
export const Max = (a, b) => (a > b ? a : b);
export const Clamp = (v, min, max) => Min(Max(v, min), max);
export const Percent = (v, a, b) => (a == b ? 0 : Clamp((v - a) / (b - a), 0, 1));
export const Lerp = (p, a, b) => a + Clamp(p, 0, 1) * (b - a);

export function ShuffleArray(array) {
    let currentIndex = array.length;
    while (currentIndex) {
        let randomIndex = RandInt(currentIndex);
        --currentIndex;
        let temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

/**
 * Perform weighted random selection from an array of choices.
 * @param {Array<{value: any, weight: number}>} choices
 * @returns {any}
 */
export function WeightedChoice(choices) {
    let totalWeight = 0;
    for (const choice of choices) {
        totalWeight += choice.weight || 1;
    }
    let r = Rand(totalWeight);
    for (const choice of choices) {
        r -= choice.weight || 1;
        if (r <= 0) return choice.value;
    }
    return choices[0].value;
}

export class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    Randomize(min, max) {
        this.x = RandBetween(min, max);
        this.y = RandBetween(min, max);
        this.z = RandBetween(min, max);
    }
    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    GetShaderCode() {
        return `vec3(${this.x.toFixed(3)}, ${this.y.toFixed(3)}, ${this.z.toFixed(3)})`;
    }
}

export const IsMobile = () =>
    !state.itchMode &&
    (navigator.userAgent.match(/Android/i) ||
        navigator.userAgent.match(/webOS/i) ||
        navigator.userAgent.match(/iPhone/i) ||
        navigator.userAgent.match(/iPad/i) ||
        navigator.userAgent.match(/iPod/i) ||
        navigator.userAgent.match(/BlackBerry/i) ||
        navigator.userAgent.match(/Windows Phone/i)) != null;
