import { state } from './state';
import { RandSeeded, IsMobile } from './utils/math';
import { InitWebgl, ClearFeedback } from './webgl';
import { ShaderObject } from './shader/ShaderObject';
import { LoadLocalStorage, LoadSavedShaderList, DeleteSelectedSave, ExportSaveList, ImportSaveList, SelectSavedShader } from './storage';
import { InitSatelliteMode, SetFavoriteFromMemory, TryToRotate, DrawShaders, UpdateUI, ChangeMemoryLocation, ButtonTogglePreview, ButtonToggleFeedback, ButtonSave, DisplaySaveListPage, ButtonRandomize, ButtonShare, ButtonSeed, ButtonSatellite, ButtonAdvanced, ButtonHelp, SetGridSize, OpenCapJS, SetBest, ButtonSatelliteHelp } from './ui/ui';

// Map HTML global IDs to window object so inline event handlers in HTML still work
window.ChangeMemoryLocation = ChangeMemoryLocation;
window.ButtonTogglePreview = ButtonTogglePreview;
window.ButtonToggleFeedback = ButtonToggleFeedback;
window.ButtonSave = ButtonSave;
window.DisplaySaveListPage = DisplaySaveListPage;
window.ButtonRandomize = ButtonRandomize;
window.ButtonShare = ButtonShare;
window.ButtonSeed = ButtonSeed;
window.ButtonSatellite = ButtonSatellite;
window.ButtonAdvanced = ButtonAdvanced;
window.ButtonHelp = ButtonHelp;
window.ButtonSatelliteHelp = ButtonSatelliteHelp;
window.SetGridSize = SetGridSize;
window.OpenCapJS = OpenCapJS;
window.ExportSaveList = ExportSaveList;
window.DeleteSelectedSave = DeleteSelectedSave;
window.UpdateUI = UpdateUI;
window.SelectSavedShader = SelectSavedShader;

/**
 * Read the feedback controls from the DOM, apply to favoriteShader, and
 * optionally re-render the preview if it is currently showing.
 */
function UpdateFeedbackUI()
{
    if (!state.favoriteShader) return;

    let useFeedback   = state.checkbox_useFeedback.checked ? 1 : 0;
    let blendMode     = parseInt(state.select_feedbackBlendMode.value);
    let amount        = parseFloat(state.range_feedbackAmount.value);
    let maskType      = parseInt(state.select_feedbackMaskType.value);
    let modType       = parseInt(state.select_feedbackModType.value);
    let modAmount     = parseFloat(state.range_feedbackModAmount.value);
    let opOrder       = parseInt(state.select_feedbackOpOrder.value);
    let doSwap        = state.checkbox_feedbackSwap.checked ? 1 : 0;
    let clearOnChange = state.checkbox_feedbackClear.checked;

    state.span_feedbackAmount.textContent    = amount.toFixed(2);
    state.span_feedbackModAmount.textContent = modAmount.toFixed(2);
    state.feedbackClearOnChange = clearOnChange;

    state.favoriteShader.useFeedback        = useFeedback;
    state.favoriteShader.feedbackBlendMode  = blendMode;
    state.favoriteShader.feedbackAmount     = amount;
    state.favoriteShader.feedbackMaskType   = maskType;
    state.favoriteShader.feedbackModType    = modType;
    state.favoriteShader.feedbackModAmount  = modAmount;
    state.favoriteShader.feedbackOpOrder    = opOrder;
    state.favoriteShader.feedbackSwap       = doSwap;

    // Chroma Key
    let chromaMode      = parseInt(state.select_feedbackChromaMode.value);
    let chromaKeyColor  = state.input_feedbackChromaKeyColor.value;
    let chromaThreshold = parseFloat(state.range_feedbackChromaThreshold.value);
    let chromaSoftness  = parseFloat(state.range_feedbackChromaSoftness.value);

    state.span_feedbackChromaThreshold.textContent = chromaThreshold.toFixed(2);
    state.span_feedbackChromaSoftness.textContent  = chromaSoftness.toFixed(2);
    state.div_chromaSettings.style.display = (maskType === 6) ? 'block' : 'none';

    state.favoriteShader.chromaMode = chromaMode;
    state.favoriteShader.chromaThreshold = chromaThreshold;
    state.favoriteShader.chromaSoftness = chromaSoftness;
    
    // Hex to RGB conversion
    const r = parseInt(chromaKeyColor.slice(1, 3), 16) / 255;
    const g = parseInt(chromaKeyColor.slice(3, 5), 16) / 255;
    const b = parseInt(chromaKeyColor.slice(5, 7), 16) / 255;
    state.favoriteShader.chromaKeyColor.set(r, g, b);

    // If feedback was just turned on, clear stale accumulation
    if (useFeedback && clearOnChange)
        ClearFeedback();

    // Re-render live if preview is showing
    if (state.showPreview && state.favoriteShader.IsVariation())
        state.favoriteShader.Render(true);
}
window.UpdateFeedbackUI = UpdateFeedbackUI;

function Init()
{
    // Populate state with DOM elements
    state.canvas_main = document.getElementById('canvas_main');
    state.canvas_save = document.getElementById('canvas_save');
    state.canvas_shader = document.getElementById('canvas_shader');
    state.buttons_top = document.getElementById('buttons_top');
    state.div_credit = document.getElementById('div_credit');
    state.div_title = document.getElementById('div_title');
    state.div_satellite = document.getElementById('div_satellite');
    state.span_generationsSatellite = document.getElementById('span_generationsSatellite');
    state.span_generations = document.getElementById('span_generations');
    
    state.button_back = document.getElementById('button_back');
    state.button_forward = document.getElementById('button_forward');
    state.button_preview = document.getElementById('button_preview');
    state.button_delete = document.getElementById('button_delete');
    state.button_help = document.getElementById('button_help');
    state.button_seed = document.getElementById('button_seed');
    state.button_advanced = document.getElementById('button_advanced');
    state.button_share = document.getElementById('button_share');
    state.button_openSatellite = document.getElementById('button_openSatellite');
    state.button_saveFolder = document.getElementById('button_saveFolder');
    
    state.div_advanced = document.getElementById('div_advanced');
    state.textarea_debug = document.getElementById('textarea_debug');
    state.select_saveList = document.getElementById('select_saveList');
    state.input_startIterations = document.getElementById('input_startIterations');
    state.checkbox_showWatermark = document.getElementById('checkbox_showWatermark');
    state.input_saveScale = document.getElementById('input_saveScale');
    state.input_gridSize = document.getElementById('input_gridSize');
    state.input_randomizeLength = document.getElementById('input_randomizeLength');
    state.input_importFile = document.getElementById('input_importFile');
    state.textarea_code = document.getElementById('textarea_code');
    state.textarea_json = document.getElementById('textarea_json');

    // Feedback UI controls
    state.checkbox_useFeedback       = document.getElementById('checkbox_useFeedback');
    state.select_feedbackBlendMode   = document.getElementById('select_feedbackBlendMode');
    state.range_feedbackAmount       = document.getElementById('range_feedbackAmount');
    state.span_feedbackAmount        = document.getElementById('span_feedbackAmount');
    state.select_feedbackMaskType    = document.getElementById('select_feedbackMaskType');
    state.select_feedbackModType     = document.getElementById('select_feedbackModType');
    state.range_feedbackModAmount    = document.getElementById('range_feedbackModAmount');
    state.span_feedbackModAmount     = document.getElementById('span_feedbackModAmount');
    state.select_feedbackOpOrder     = document.getElementById('select_feedbackOpOrder');
    state.checkbox_feedbackSwap      = document.getElementById('checkbox_feedbackSwap');
    state.checkbox_feedbackClear     = document.getElementById('checkbox_feedbackClear');
    state.button_feedback            = document.getElementById('button_feedback');
    state.button_satelliteFeedback   = document.getElementById('button_satelliteFeedback');

    state.select_feedbackChromaMode      = document.getElementById('select_feedbackChromaMode');
    state.input_feedbackChromaKeyColor   = document.getElementById('input_feedbackChromaKeyColor');
    state.range_feedbackChromaThreshold  = document.getElementById('range_feedbackChromaThreshold');
    state.span_feedbackChromaThreshold   = document.getElementById('span_feedbackChromaThreshold');
    state.range_feedbackChromaSoftness   = document.getElementById('range_feedbackChromaSoftness');
    state.span_feedbackChromaSoftness    = document.getElementById('span_feedbackChromaSoftness');
    state.div_chromaSettings             = document.getElementById('div_chromaSettings');

    state.canvasContext_main = state.canvas_main.getContext('2d');
    state.canvasContext_save = state.canvas_save.getContext('2d');
    state.canvasContext_shader = state.canvas_shader.getContext('webgl');
    state.defaultCanvasWidth = state.canvas_main.width;
    state.defaultCanvasHeight = state.canvas_main.height;

    // Attach event listeners that were inline in JS
    window.onresize = () => UpdateUI();

    let onselect = (e) =>
    {
        if (e.button != 0 || state.satelliteMode)
            return;
            
        let rect = state.canvas_main.getBoundingClientRect();
        let scaleX = state.canvas_main.width / rect.width;
        let scaleY = state.canvas_main.height / rect.height;
        let mouseX = (e.clientX- rect.left) * scaleX; 
        let mouseY = (e.clientY- rect.top) * scaleY;
        let X = state.gridSize * mouseX / state.canvas_main.width | 0;
        let Y = state.gridSize * mouseY / state.canvas_main.height | 0;
        
        if (X<0 || X>state.gridSize-1 || Y<0 || Y>state.gridSize-1)
            return; 
           
        SetBest(X,Y);
    };

    state.canvas_main.onmousedown = onselect;
    state.canvas_main.ontouchstart = onselect; // replacing ontouch with ontouchstart which is standard

    state.canvas_shader.onclick = (e) =>
    {
        if (state.satelliteMode)
            return;

        state.showPreview = 0;
        UpdateUI();
    };

    window.onkeydown = (e) =>
    {
        if (state.satelliteMode)
            return;
            
        let used = 0;
        if (e.keyCode == 32) // Space
        {
            if (state.favoriteShader)
                ButtonTogglePreview();
            used = 1;
        }
        else if (e.keyCode == 70) // F
            ButtonToggleFeedback(), used = 1;
        else if (e.keyCode == 83) // S
            ButtonSave(), used = 1;
        else if (e.keyCode == 90) // Z
            ChangeMemoryLocation(-1), used = 1;
        else if (e.keyCode == 88) // X
            ChangeMemoryLocation(1), used = 1;
        else if (e.keyCode == 82) // R
            ButtonRandomize(), used = 1;
        
        if (used)
        {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    state.input_importFile.onchange = (e) => { ImportSaveList(e.target.files[0]); };

    // Initialization logic
    state.isInit = 1;

    let url = new URL(window.location.href);
    let searchParams = url.searchParams;
    if (searchParams.has('shader'))
    {
        let shaderText = searchParams.get('shader');
        let rawObject = JSON.parse(shaderText);
        state.favoriteShader = Object.assign(new ShaderObject(), rawObject).Clone();
    }
    else if (searchParams.has('crushed'))
    {
        let crushedString = searchParams.get('crushed');
        // Uncrush logic is synchronous in jsonCrush.js
        const { JSONUncrush } = require('./utils/jsonCrush');
        let rawObject = JSON.parse(JSONUncrush(crushedString));
        state.favoriteShader = Object.assign(new ShaderObject(), rawObject).Clone();
    }
    
    if (!IsMobile() && !state.itchMode && searchParams.has('satellite'))
        state.satelliteMode = parseInt(searchParams.get('satellite'));


    state.uniqueID = RandSeeded();
    InitWebgl();
    state.shaderMemory.push(new ShaderObject());
    
    LoadLocalStorage();
    LoadSavedShaderList();
    
    for(let i=0; i<state.gridSize; i++)
        state.shaderGrid[i] = [];
        
    if (state.satelliteMode)
        InitSatelliteMode();
    else
    {
        if (state.favoriteShader)
            state.shaderMemory[state.shaderMemoryLocation] = state.favoriteShader;
        SetFavoriteFromMemory();
            
        if (!state.itchMode && IsMobile())
            TryToRotate();
            
        DrawShaders();
        UpdateUI();
    }
    state.isInit = 0;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Init);
} else {
    Init();
}
