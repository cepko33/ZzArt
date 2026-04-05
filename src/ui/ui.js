import { state } from '../state';
import { Rand, RandInt, RandSeeded, HashString, Clamp, IsMobile, Vector3 } from '../utils/math';
import { ShaderObject } from '../shader/ShaderObject';
import { AddToSaveList, DeleteSelectedSave, ExportSaveList, SaveLocalStorage, SaveSettingsToCookie } from '../storage';
import download from '../utils/download';
import { JSONCrush } from '../utils/jsonCrush';
import { ClearFeedback } from '../webgl';
import { buildCompositeShader } from '../shader/CompositeShader';

/**
 * Updates feedback settings in favoriteShader from reactive state.
 * Replaces the old manual DOM lookup version.
 */
export function UpdateFeedbackUI() {
    if (!state.favoriteShader) return;

    let fs = state.favoriteShader;

    // Chroma Key Softness/Threshold display handled by Vue bindings
    // Sync Vector3 to/from hex handled in component

    if (fs.useFeedback && state.feedbackClearOnChange)
        ClearFeedback();

    if (state.showPreview && fs.IsVariation())
        fs.Render(true);

    SaveLocalStorage();
}

/**
 * Simple syntax highlighting for GLSL code viewer in the pipeline diagram.
 */
export function highlightShader(code) {
    if (!code) return '';
    
    // basic highlighting logic
    const keywords = ['void', 'main', 'vec2', 'vec3', 'vec4', 'float', 'int', 'uniform', 'varying', 'attribute', 'if', 'else', 'for', 'return'];
    const builtins = ['gl_FragColor', 'gl_FragCoord', 'texture2D', 'mix', 'clamp', 'sin', 'cos', 'tan', 'pow', 'sqrt', 'abs', 'floor', 'ceil', 'mod', 'min', 'max', 'dot', 'cross', 'normalize'];
    
    let highlighted = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
        
    keywords.forEach(word => {
        const re = new RegExp(`\\b${word}\\b`, 'g');
        highlighted = highlighted.replace(re, `<span class="glsl-keyword">${word}</span>`);
    });
    
    builtins.forEach(word => {
        const re = new RegExp(`\\b${word}\\b`, 'g');
        highlighted = highlighted.replace(re, `<span class="glsl-builtin">${word}</span>`);
    });
    
    // highlight comments
    highlighted = highlighted.replace(/\/\/(.*)/g, '<span class="glsl-comment">//$1</span>');
    highlighted = highlighted.replace(/\/\*([\s\S]*?)\*\//g, '<span class="glsl-comment">/*$1*/</span>');
    
    return highlighted;
}

export function SetGridSize(newGridSize)
{
    state.gridSize = Clamp(newGridSize, 2, 10);
    state.shaderGrid = [];
    for(let i=0; i<state.gridSize; i++)
        state.shaderGrid[i] = [];
    
    SetFavoriteFromMemory();
    DrawShaders();
    UpdateUI();
}

/**
 * Replaces manual DOM updates with reactive state logic.
 * Primarily handles non-reactive side effects like URL pushState and animation loops.
 */
export function UpdateUI()
{
    if (state.satelliteMode)
        return;

    if (!state.isInit)
    {
        // clear url
        let url = new URL(window.location.href);
        url.search = "";
        window.history.pushState(null, null, url.toString());
    }

    // ── Preview animation loop (starts when preview is shown, self-stops) ───
    if (state.showPreview && !state._previewAnimating)
    {
        state._previewAnimating = true;
        (function AnimatePreview()
        {
            if (state.showPreview && !state.satelliteMode)
            {
                if (state.favoriteShader && state.favoriteShader.IsVariation())
                    state.favoriteShader.Render(true);
                requestAnimationFrame(AnimatePreview);
            }
            else
            {
                state._previewAnimating = false;
            }
        })();
    }
    
    // set title
    let shader = state.shaderMemory[state.shaderMemoryLocation];
    if (shader)
        document.title = `ZzArt - ` + shader.GetGenerationString();
    
    // resize canvas to fit window
    if (state.canvas_main) {
        let a = state.canvas_main.width / state.canvas_main.height;
        let isMobile = IsMobile();
        let w = window.innerWidth - (isMobile || state.itchMode ? 20 : 100);
        let h = window.innerHeight - (state.itchMode ? 120 : 150);
        let wa = w/h;
        if (state.rotateCanvas)
            wa = 1/wa;
        if (wa > a)
            w = h * a;
        else
            h = w / a;
        
        state.canvas_main.style.width = w + 'px';
        state.canvas_main.style.height = h + 'px';
        state.canvas_shader.style.width = w + 'px';
        state.canvas_shader.style.height = h + 'px';
    }

    SaveLocalStorage();
}

export function ChangeMemoryLocation(direction)
{
    if (state.shaderMemoryLocation + direction < 0 || state.shaderMemoryLocation + direction >= state.shaderMemory.length)
        return;
        
    if (state.showPreview)
    {
        state.showPreview = false;
        UpdateUI();
        return;
    }
        
    state.shaderMemoryLocation += direction;
    SetFavoriteFromMemory();
    DrawShaders();
    UpdateUI();
}

export function ButtonSatellite()
{
    let url = new URL(window.location.href);
    url.search = 'satellite=1';
    window.open(url);
}

export function ButtonSatelliteHelp()
{
    window.alert(
`Welcome to 𝓩𝔃𝓐𝓻𝓽 ~ Abstract Art Evolution

This satellite 📡 mode allows you to view a full screen preview of our current favorite on a second monitor while browsing!`
    );
}

export function ButtonHelp()
{
    window.alert(
`Welcome to 𝓩𝔃𝓐𝓻𝓽 ~ Abstract Art Evolution

To get started, click 🎲 a few times generate random seeds.
When you like something, just click it see more variations.
You can click 🔍 or press space to see a large preview.
Use 📡 to view open the large preview in a separate window.
Click 💾 to save your art as a 4K png image file.`
    );
}

export function Randomize(seed)
{
    state.randSeed = seed;
    state.showPreview = false;
    ++state.shaderMemoryLocation;
    state.shaderMemory.length = state.shaderMemoryLocation;
    state.shaderMemory.push(new ShaderObject());
    RandomizeShaders(state.feedbackLocked);
    DrawShaders();
    UpdateUI();
}

export function ButtonRandomize()
{
    let seed = Math.abs(Date.now() % 1e9);
    Randomize(seed);
}

export function ButtonSeed()
{
    let seedString = window.prompt('Enter a ZzArt seed to use for randomization:', '');
    if (seedString === null)
        return;
        
    seedString = String(seedString);
    let seed = parseInt(seedString);
    if (!Number.isInteger(seed))
        seed = HashString(seedString);
    if (seed == 0)
        seed = 1;
    
    state.randSeedString = seedString;
    Randomize(seed);
    state.randSeedString = '';
}

export function ButtonAdvanced()
{
    state.advancedMode = !state.advancedMode;
    SaveSettingsToCookie();
    UpdateUI();
}

export function ButtonToggleFeedback()
{
    if (!state.favoriteShader) return;

    state.favoriteShader.useFeedback = state.favoriteShader.useFeedback ? 0 : 1;

    if (state.feedbackClearOnChange || state.favoriteShader.useFeedback)
        ClearFeedback();

    if (state.favoriteShader.useFeedback && !state.showPreview && state.favoriteShader.IsVariation())
        ButtonTogglePreview();
    else
        UpdateUI();
}

export function ButtonTogglePreview()
{
    state.showPreview = !state.showPreview;
    if (state.showPreview)
    {
        state.canvas_shader.width = state.canvas_main.width;
        state.canvas_shader.height = state.canvas_main.height;
        if (state.favoriteShader && state.favoriteShader.IsVariation())
        {
            ClearFeedback();
            for(let i=0; i<10; i++)
                state.favoriteShader.Render(true);
        }
    }
        
    UpdateUI();
}

export function ButtonSave()
{
    if (!state.favoriteShader)
        return;

    AddToSaveList(state.favoriteShader);

    let saveScale = parseInt(state.settings.saveScale);
    if (saveScale <= 0)
        return;
        
    state.canvas_shader.width = saveScale * state.defaultCanvasWidth;
    state.canvas_shader.height = saveScale * state.defaultCanvasHeight;
    state.favoriteShader.Render(false);

    let canvas = state.canvas_shader;

    if (state.settings.showWatermark)
    {
        canvas = state.canvas_save;
        canvas.width = state.canvas_shader.width;
        canvas.height = state.canvas_shader.height;
        let x = state.contexts.save;
        x.drawImage(state.canvas_shader, 0, 0);

        let watermarkText = `𝓩𝔃𝓐𝓻𝓽 ~ ${state.favoriteShader.GetGenerationString()} ~ zzart.3d2k.com`;
        let X = canvas.width - 10;
        let Y = canvas.height - 10;
        x.textAlign = 'right';
        x.shadowBlur = 6;
        x.shadowColor = '#0009';
        x.fillStyle = '#000';
        x.font = '30px monospace';
        for (let i=-1; i<=1; i+=2)
            for (let j=-1; j<=1; j+=2)
                x.fillText(watermarkText, X + 1 * i, Y + 1 * j);
        x.fillStyle = '#fff';
        x.fillText(watermarkText, X, Y);
    }
    
    let filename = 'ZzArt-' + state.favoriteShader.GetGenerationString(1) + ".png";
    download(canvas.toDataURL("image/png"), filename, "image/png");
    UpdateUI();
}

export function SaveCode()
{
    let filename = 'ZzArt-' + state.favoriteShader.GetGenerationString(1) + ".txt";
    download(state.favoriteShader.GetCode(), filename, "data:application/octet-stream");
}

export function ButtonShare()
{
    window.open(GetShareUrl());
}

export function GetShareUrl()
{
    let shader = state.shaderMemory[state.shaderMemoryLocation].Clone();
    shader.MakeAllObjectFloatsFixed(shader, 5);
    let crushed = JSONCrush(JSON.stringify(shader));
    
    let search = '';
    search += "&crushed=" + crushed;
    let url = new URL(window.location.href);
    url.search = search;
    return url.toString();
}

export function OpenCapJS()
{
    if (!state.favoriteShader)
        return;

    let filename = 'ZzArt - ' + state.favoriteShader.GetGenerationString();
    let search = "";
    search += "filename=" + encodeURIComponent(filename);
    search += "&mode=" + encodeURIComponent('shadertoy');
    search += "&code=" + encodeURIComponent(state.favoriteShader.GetCode());
    let url = new URL('https://capjs.3d2k.com');
    url.search = search;
    window.open(url);
}

export function RandomizeShaders(keepFeedback = false)
{
    state.saveListIndex = 0;
    state.favoriteShader = new ShaderObject();
    if (keepFeedback)
    {
        const oldShader = state.shaderMemory[state.shaderMemoryLocation-1];
        if (oldShader)
        {
            state.favoriteShader.useFeedback       = oldShader.useFeedback;
            state.favoriteShader.feedbackBlendMode = oldShader.feedbackBlendMode;
            state.favoriteShader.feedbackAmount    = oldShader.feedbackAmount;
            state.favoriteShader.feedbackMaskType  = oldShader.feedbackMaskType;
            state.favoriteShader.feedbackModType   = oldShader.feedbackModType;
            state.favoriteShader.feedbackModAmount = oldShader.feedbackModAmount;
            state.favoriteShader.feedbackOpOrder   = oldShader.feedbackOpOrder;
            state.favoriteShader.feedbackSwap      = oldShader.feedbackSwap;
            state.favoriteShader.feedbackSharpen   = oldShader.feedbackSharpen;
            state.favoriteShader.feedbackBlur      = oldShader.feedbackBlur;
            state.favoriteShader.chromaMode        = oldShader.chromaMode;
            state.favoriteShader.chromaKeyColor    = oldShader.chromaKeyColor.Clone ? oldShader.chromaKeyColor.Clone() : Object.assign(new Vector3(), oldShader.chromaKeyColor);
            state.favoriteShader.chromaThreshold   = oldShader.chromaThreshold;
            state.favoriteShader.chromaSoftness    = oldShader.chromaSoftness;
        }
    }

    for(let i=9; i--;) Rand();
    
    for(let X=0; X<state.gridSize; X++)
        for(let Y=0; Y<state.gridSize; Y++)
        {
            let shader = state.shaderGrid[X][Y] = state.favoriteShader.Clone();
            shader.SetGridPos(X, Y);
            shader.Randomize(keepFeedback);
        }
}

export function DrawShaders()
{
    let ctx = state.contexts.main;
    if (!ctx) return;

    state.gridRenderId++;
    const currentRenderId = state.gridRenderId;
    
    state.gridRenderQueue = [];
    state.gridRenderRecords = [];

    const G = state.gridSize;
    for(let X=0; X<G; X++)
        for(let Y=0; Y<G; Y++)
        {
            state.gridRenderQueue.push({x: X, y: Y});
            state.gridRenderRecords.push({
                x: X, 
                y: Y, 
                opacity: 0, 
                rendered: false,
                canvas: document.createElement('canvas')
            });
        }

    requestAnimationFrame(() => AnimateGridRender(currentRenderId));
}

function AnimateGridRender(renderId)
{
    if (renderId !== state.gridRenderId) return;

    const ctx = state.contexts.main;
    const c = state.canvas_main;
    if (!ctx || !c) return;

    const G = state.gridSize;
    const gap = 10;
    const SX = (c.width - gap) / G;
    const SY = (c.height - gap) / G;
    const W = (c.width - gap * (G + 1)) / G;
    const H = (c.height - gap * (G + 1)) / G;

    for (let i = 0; i < 2; i++)
    {
        if (state.gridRenderQueue.length > 0)
        {
            const {x, y} = state.gridRenderQueue.shift();
            const shader = state.shaderGrid[x][y];
            
            state.canvas_shader.width = W;
            state.canvas_shader.height = H;
            
            if (shader.useFeedback)
            {
                ClearFeedback();
                for(let j=0; j<10; j++)
                    shader.Render(true);
            }
            else
            {
                shader.Render();
            }

            const record = state.gridRenderRecords.find(r => r.x === x && r.y === y);
            if (record)
            {
                record.canvas.width = W;
                record.canvas.height = H;
                const rCtx = record.canvas.getContext('2d');
                rCtx.drawImage(state.canvas_shader, 0, 0, W, H);
                record.rendered = true;
            }
        }
    }

    ctx.clearRect(0, 0, c.width, c.height);

    let allDone = (state.gridRenderQueue.length === 0);
    let anyStillFading = false;

    for (let record of state.gridRenderRecords)
    {
        const posX = gap + SX * record.x;
        const posY = gap + SY * record.y;

        if (record.rendered)
        {
            if (record.opacity < 1.0)
            {
                record.opacity += 0.08; 
                if (record.opacity > 1.0) record.opacity = 1.0;
                else anyStillFading = true;
            }

            ctx.globalAlpha = record.opacity;
            ctx.drawImage(record.canvas, posX, posY);
            ctx.globalAlpha = 1.0;
        }

        const fs = state.favoriteShader;
        if (fs && fs.gridPosX === record.x && fs.gridPosY === record.y)
        {
            ctx.beginPath();
            ctx.rect(posX - gap / 2, posY - gap / 2, W + gap, H + gap);
            ctx.lineWidth = 7;
            ctx.strokeStyle = '#f00';
            ctx.stroke();
        }
        
        ctx.beginPath();
        ctx.rect(posX, posY, W, H);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000';
        ctx.stroke();
    }

    if (!allDone || anyStillFading)
    {
        requestAnimationFrame(() => AnimateGridRender(renderId));
    }
}

export function SetBest(bestX, bestY)
{
    if (state.feedbackClearOnChange)
        ClearFeedback();

    if (state.feedbackLocked && state.favoriteShader)
    {
        let target = state.shaderGrid[bestX][bestY];
        let source = state.favoriteShader;
        target.useFeedback       = source.useFeedback;
        target.feedbackBlendMode = source.feedbackBlendMode;
        target.feedbackAmount    = source.feedbackAmount;
        target.feedbackMaskType  = source.feedbackMaskType;
        target.feedbackModType   = source.feedbackModType;
        target.feedbackModAmount = source.feedbackModAmount;
        target.feedbackOpOrder   = source.feedbackOpOrder;
        target.feedbackSwap      = source.feedbackSwap;
        target.feedbackSharpen   = source.feedbackSharpen;
        target.feedbackBlur      = source.feedbackBlur;
        target.chromaMode        = source.chromaMode;
        target.chromaKeyColor    = source.chromaKeyColor.Clone ? source.chromaKeyColor.Clone() : Object.assign(new Vector3(), source.chromaKeyColor);
        target.chromaThreshold   = source.chromaThreshold;
        target.chromaSoftness    = source.chromaSoftness;
    }

    state.favoriteShader = state.shaderGrid[bestX][bestY];
    state.favoriteShader.randSeed = state.randSeed;
    
    ++state.favoriteShader.subGeneration;
    if (state.favoriteShader.generation == 0)
        ++state.favoriteShader.generation;
    
    ++state.shaderMemoryLocation;
    state.shaderMemory.length = state.shaderMemoryLocation;
    state.shaderMemory.push(state.favoriteShader.Clone());
    
    MakeVariations(bestX, bestY);
    DrawShaders();
    UpdateUI();
}

export function MakeVariations(skipX, skipY)
{
    state.saveListIndex = 0;
    state.ui.textareaCode = state.favoriteShader.GetCode();
    state.ui.textareaJson = btoa(JSON.stringify(state.favoriteShader));
        
    for(let X=0; X<state.gridSize; X++)
        for(let Y=0; Y<state.gridSize; Y++)
        {
            let shader = state.shaderGrid[X][Y] = state.favoriteShader.Clone();
            shader.SetGridPos(X, Y);
            
            if (X != skipX || Y != skipY)
                shader.Mutate();
        }
}

export function SetFavoriteFromMemory()
{
    if (!state.favoriteShader)
    {
        RandomizeShaders();
        return;
    }

    state.favoriteShader = state.shaderMemory[state.shaderMemoryLocation];
    state.randSeed = state.favoriteShader.randSeed;
    state.randSeedString = state.favoriteShader.randSeedString;
    
    if (state.favoriteShader.IsVariation())
    {
        if (state.favoriteShader.gridPosX >= state.gridSize || state.favoriteShader.gridPosY >= state.gridSize)
            state.favoriteShader.gridPosX = state.favoriteShader.gridPosY = 0;
    
        let X = state.favoriteShader.gridPosX;
        let Y = state.favoriteShader.gridPosY;
        
        state.shaderGrid[X][Y] = state.favoriteShader.Clone();
        MakeVariations(X, Y);
    }
    else if (state.favoriteShader.IsSaveList())
    {
        state.saveListIndex = state.favoriteShader.saveListIndex;
        DisplaySaveListPage(0);
    }
    else
        RandomizeShaders();
        
    state.randSeedString = '';
}

export function DisplaySaveListPage(saveMemory=1)
{
    state.showPreview = false;
    state.favoriteShader = new ShaderObject();
    state.favoriteShader.saveListIndex = state.saveListIndex;
    let shader = state.favoriteShader;
    
    if (saveMemory)
    {
        ++state.shaderMemoryLocation;
        state.shaderMemory.length = state.shaderMemoryLocation;
        state.shaderMemory.push(shader.Clone());
    }
    
    for(let Y=0; Y<state.gridSize; Y++)
        for(let X=0; X<state.gridSize; X++)
        {
            let shader = new ShaderObject();
            
            let i = state.saveListIndex;
            ++state.saveListIndex;
            
            if (i < state.saveList.length)
                shader = state.saveList[i].Clone();
            state.shaderGrid[X][Y] = shader;
            shader.SetGridPos(X, Y);
        }
    
    if (state.saveListIndex >= state.saveList.length)
        state.saveListIndex = 0;

    DrawShaders();
    UpdateUI();
}

export function UpdateSatelliteMode()
{ 
    let localStorageItem = localStorage.saveData;
    if (localStorageItem)
    {
        let saveData = JSON.parse(localStorageItem);
        if (saveData.lastUpdate != state.lastSatelliteUpdate)
        {
            state.lastSatelliteUpdate = saveData.lastUpdate;
            let rawObject = saveData.favorite;
            
            if (state.feedbackClearOnChange || rawObject.uniqueID != state.favoriteShader?.uniqueID)
                ClearFeedback();
            state.favoriteShader = Object.assign(new ShaderObject(), rawObject).Clone();
        }
    }
}

export function InitSatelliteMode()
{
    state.favoriteShader.randSeed = 0;
    
    function Animate() {
        if (state.satelliteMode) {
            state.favoriteShader.Render(true);
            requestAnimationFrame(Animate);
        }
    }
    requestAnimationFrame(Animate);
    
    setInterval(UpdateSatelliteMode, 100);
}

export function TryToRotate()
{
    let newRotateCanvas = window.innerHeight > window.innerWidth;
    if (state.rotateCanvas == newRotateCanvas)
        return;
        
    state.rotateCanvas = newRotateCanvas;
    if (state.rotateCanvas)
    {
        state.canvas_main.width = state.defaultCanvasHeight;
        state.canvas_main.height = state.defaultCanvasWidth;
    }
    else
    {
        state.canvas_main.width = state.defaultCanvasWidth;
        state.canvas_main.height = state.defaultCanvasHeight;
    }
}
