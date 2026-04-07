import { reactive, shallowReactive } from 'vue';

// Global State Variables for ZzArt
export const state = reactive({
    // Render Contexts (using shallowReactive to avoid deep tracking of WebGL internals)
    contexts: shallowReactive({
        main: null,
        save: null,
        shader: null,
    }),

    // Core Configuration
    config: {
        defaultWidth: 1080,
        defaultHeight: 1920,
        maxIterations: 9,
        dataVersion: 3,
    },

    // Application State
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1080,
    windowHeight: typeof window !== 'undefined' ? window.innerHeight : 1920,
    shaderMemory: [],
    shaderGrid: [],
    gridSize: 3,
    favoriteShader: null,
    shaderMemoryLocation: 0,
    showPreview: false,
    advancedMode: false,
    rotateCanvas: false,
    itchMode: false,
    satelliteMode: 0,
    startIterations: 1,
    uniqueID: 0,
    isInit: false,
    time: 0,
    accumulatedTime: 0,
    lastFrameTime: 0,
    vertexShader: 0,
    lastSatelliteUpdate: 0,

    // Lists and storage
    saveList: [],
    saveListIndex: 0,

    // Rand context
    randSeedString: '',
    randSeed: Date.now(),

    // Feedback / compositing (ping-pong framebuffers)
    feedback: {
        framebuffers: [null, null, null],
        textures: [null, null, null],
        index: 0,
        canvasWidth: 0,
        canvasHeight: 0,
        clearOnChange: true,
        locked: false,
        compositeProgram: null,
    },

    // Async Grid Render State
    gridRender: {
        queue: [],
        records: [], // {x, y, canvas, opacity, rendered}
        isRendering: false,
        id: 0,
    },

    // Settings that were updated via cookies/storage
    settings: {
        showWatermark: false,
        saveScale: 2,
        randomizeLength: 5,
        simulationSpeed: 1.0,
    },

    // UI helper for raw code viewing
    ui: {
        textareaDebug: '',
        textareaCode: '',
        textareaJson: '',
    },
});

// Legacy mapping for compatibility with existing modules during transition
// We will gradually remove these and access via state.*
Object.defineProperty(state, 'canvasContext_main', {
    get: () => state.contexts.main,
    set: (v) => (state.contexts.main = v),
});
Object.defineProperty(state, 'canvasContext_save', {
    get: () => state.contexts.save,
    set: (v) => (state.contexts.save = v),
});
Object.defineProperty(state, 'canvasContext_shader', {
    get: () => state.contexts.shader,
    set: (v) => (state.contexts.shader = v),
});
Object.defineProperty(state, 'defaultCanvasWidth', {
    get: () => state.config.defaultWidth,
});
Object.defineProperty(state, 'defaultCanvasHeight', {
    get: () => state.config.defaultHeight,
});
Object.defineProperty(state, 'maxIterations', {
    get: () => state.config.maxIterations,
});

// Feedback aliases
Object.defineProperty(state, 'feedbackClearOnChange', {
    get: () => state.feedback.clearOnChange,
    set: (v) => (state.feedback.clearOnChange = v),
});
Object.defineProperty(state, 'feedbackLocked', {
    get: () => state.feedback.locked,
    set: (v) => (state.feedback.locked = v),
});
Object.defineProperty(state, 'gridRenderId', {
    get: () => state.gridRender.id,
    set: (v) => (state.gridRender.id = v),
});
Object.defineProperty(state, 'gridRenderQueue', {
    get: () => state.gridRender.queue,
    set: (v) => (state.gridRender.queue = v),
});
Object.defineProperty(state, 'gridRenderRecords', {
    get: () => state.gridRender.records,
    set: (v) => (state.gridRender.records = v),
});
