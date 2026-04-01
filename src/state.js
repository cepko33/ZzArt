// Global State Variables for ZzArt
export const state = {
    canvasContext_main: null,
    canvasContext_save: null,
    canvasContext_shader: null,
    defaultCanvasWidth: 1920,
    defaultCanvasHeight: 1080,
    shaderMemory: [],
    shaderGrid: [],
    gridSize: 5,
    favoriteShader: null, // this gets set to an object
    shaderMemoryLocation: 0,
    showPreview: 0,
    advancedMode: 0,
    rotateCanvas: 0,
    dataVersion: 3,
    itchMode: 0,
    satelliteMode: 0,
    startIterations: 1,
    uniqueID: 0,
    isInit: 0,
    time: 0,
    maxIterations: 9,
    vertexShader: 0,
    
    // UI DOM Refs
    canvas_main: null,
    canvas_save: null,
    canvas_shader: null,
    buttons_top: null,
    div_credit: null,
    div_title: null,
    div_satellite: null,
    span_generationsSatellite: null,
    span_generations: null,
    
    button_back: null,
    button_forward: null,
    button_preview: null,
    button_delete: null,
    button_help: null,
    button_seed: null,
    button_advanced: null,
    button_share: null,
    button_openSatellite: null,
    button_saveFolder: null,
    
    div_advanced: null,
    textarea_debug: null,
    select_saveList: null,
    input_startIterations: null,
    checkbox_showWatermark: null,
    input_saveScale: null,
    input_gridSize: null,
    input_randomizeLength: null,
    input_importFile: null,
    textarea_code: null,
    textarea_json: null,
    
    // Lists and storage
    saveList: [],
    saveListIndex: 0,
    
    // Rand context
    randSeedString: '',
    randSeed: Date.now()
};
