import { createApp } from 'vue';
import App from './App.jsx';
import { state } from './state';
import { InitWebgl } from './webgl';
import { ShaderObject } from './shader/ShaderObject';
import { POSTPROCESS_FUNCTIONS } from './shader/lib/postprocess';
import { LoadLocalStorage, LoadSavedShaderList, LoadSettingsFromCookie } from './storage';
import {
    InitSatelliteMode,
    SetFavoriteFromMemory,
    DrawShaders,
    UpdateUI,
    TryToRotate,
} from './ui/ui';
import { IsMobile, RandSeeded } from './utils/math';

async function InitApp() {
    // 1. Create and Mount Vue App
    const app = createApp(App);
    app.mount('#app');

    // 2. Wait for Vue to mount and refs to be assigned to state
    // We can use a simple check or a nextTick equivalent
    await new Promise((resolve) => {
        const check = () => {
            if (state.canvas_main) resolve();
            else requestAnimationFrame(check);
        };
        check();
    });

    // 3. Initialization logic from legacy Init()
    state.isInit = true;

    let url = new URL(window.location.href);
    let searchParams = url.searchParams;

    if (searchParams.has('shader')) {
        let shaderText = searchParams.get('shader');
        let rawObject = JSON.parse(shaderText);
        state.favoriteShader = Object.assign(new ShaderObject(), rawObject).Clone();
    } else if (searchParams.has('crushed')) {
        let crushedString = searchParams.get('crushed');
        // Uncrush logic is synchronous in jsonCrush.js
        const { JSONUncrush } = await import('./utils/jsonCrush');
        let rawObject = JSON.parse(JSONUncrush(crushedString));
        state.favoriteShader = Object.assign(new ShaderObject(), rawObject).Clone();
    }

    if (!IsMobile() && !state.itchMode && searchParams.has('satellite'))
        state.satelliteMode = parseInt(searchParams.get('satellite'));

    state.uniqueID = RandSeeded();
    state.postProcessFunctions = POSTPROCESS_FUNCTIONS;
    InitWebgl();
    state.shaderMemory.push(new ShaderObject());

    LoadLocalStorage();
    LoadSavedShaderList();
    LoadSettingsFromCookie();

    for (let i = 0; i < state.gridSize; i++) state.shaderGrid[i] = [];

    if (state.satelliteMode) {
        InitSatelliteMode();
    } else {
        if (state.favoriteShader)
            state.shaderMemory[state.shaderMemoryLocation] = state.favoriteShader;
        SetFavoriteFromMemory();

        if (!state.itchMode && IsMobile()) TryToRotate();

        DrawShaders();
        UpdateUI();
    }

    state.isInit = false;

    // Attach global window event listeners
    window.onresize = () => UpdateUI();

    const onselect = (e) => {
        if (e.button != 0 || state.satelliteMode) return;
        let rect = state.canvas_main.getBoundingClientRect();
        let scaleX = state.canvas_main.width / rect.width;
        let scaleY = state.canvas_main.height / rect.height;
        let mouseX = (e.clientX - rect.left) * scaleX;
        let mouseY = (e.clientY - rect.top) * scaleY;
        let X = ((state.gridSize * mouseX) / state.canvas_main.width) | 0;
        let Y = ((state.gridSize * mouseY) / state.canvas_main.height) | 0;
        if (X < 0 || X > state.gridSize - 1 || Y < 0 || Y > state.gridSize - 1) return;
        import('./ui/ui').then((m) => m.SetBest(X, Y));
    };

    state.canvas_main.onmousedown = onselect;
    state.canvas_main.ontouchstart = onselect;

    state.canvas_shader.onclick = (e) => {
        if (state.satelliteMode) return;
        state.showPreview = false;
        UpdateUI();
    };

    window.onkeydown = (e) => {
        if (state.satelliteMode) return;
        let used = 0;
        if (e.keyCode == 32) {
            // Space
            if (state.favoriteShader) import('./ui/ui').then((m) => m.ButtonTogglePreview());
            used = 1;
        } else if (e.keyCode == 70)
            (import('./ui/ui').then((m) => m.ButtonToggleFeedback()), (used = 1));
        else if (e.keyCode == 83) (import('./ui/ui').then((m) => m.ButtonSave()), (used = 1));
        else if (e.keyCode == 90)
            (import('./ui/ui').then((m) => m.ChangeMemoryLocation(-1)), (used = 1));
        else if (e.keyCode == 88)
            (import('./ui/ui').then((m) => m.ChangeMemoryLocation(1)), (used = 1));
        else if (e.keyCode == 82) (import('./ui/ui').then((m) => m.ButtonRandomize()), (used = 1));

        if (used) {
            e.preventDefault();
            e.stopPropagation();
        }
    };
}

InitApp().catch((err) => console.error('Initialization failed:', err));
