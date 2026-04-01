import { state } from '../state';
import { Rand, RandInt, RandSeeded, HashString, Clamp, IsMobile, Vector3 } from '../utils/math';
import { ShaderObject } from '../shader/ShaderObject';
import { AddToSaveList, DeleteSelectedSave, ExportSaveList, SaveLocalStorage, SaveSettingsToCookie } from '../storage';
import download from '../utils/download';
import { JSONCrush } from '../utils/jsonCrush';
import { ClearFeedback } from '../webgl';
import { buildCompositeShader } from '../shader/ShaderLibrary';

export function SetGridSize(newGridSize)
{
    state.gridSize = Clamp(newGridSize,2,10);
    state.shaderGrid=[];
    for(let i=0; i<state.gridSize; i++)
        state.shaderGrid[i] = [];
    
    SetFavoriteFromMemory();
    DrawShaders();
    UpdateUI();
}

export function UpdateUI(resetSaveListSelection=1)
{
    if (state.satelliteMode)
        return;

    if (!state.isInit)
    {
        // clear url
        let url = new URL(window.location.href);
        url.search= "";
        window.history.pushState(null,null,url.toString());
    }

    if (resetSaveListSelection)
        state.select_saveList.selectedIndex=-1;
    state.startIterations = Clamp(parseInt(state.input_startIterations.value), 1, state.maxIterations);
    state.button_back.disabled = state.shaderMemoryLocation <= 0;
    state.button_forward.disabled = state.shaderMemoryLocation >= state.shaderMemory.length-1;
    state.button_preview.disabled = !state.favoriteShader || state.favoriteShader.gridPosX<0;
    state.canvas_main.hidden = state.showPreview;
    state.canvas_shader.hidden = !state.showPreview;
    state.div_advanced.style.display = state.advancedMode? 'block' : 'none';
    state.button_delete.style.display = state.advancedMode? 'inline' : 'none';
    state.button_help.style.display = state.advancedMode? 'none' : 'inline';
    state.textarea_debug.hidden = state.textarea_debug.value == '';
    state.button_saveFolder.style.display = state.saveList.length==0? 'none' : 'inline';

    if (state.advancedMode)
        UpdatePipelineUI();
    
    let s = state.shaderMemory[state.shaderMemoryLocation];
    state.span_generations.innerHTML = s.GetGenerationString();
    
    // ── Sync feedback controls from current shader ──────────────────────────
    if (state.checkbox_useFeedback && state.favoriteShader)
    {
        let fs = state.favoriteShader;
        state.checkbox_useFeedback.checked       = !!fs.useFeedback;
        state.select_feedbackBlendMode.value     = fs.feedbackBlendMode  ?? 0;
        state.range_feedbackAmount.value         = fs.feedbackAmount     ?? 0.92;
        state.span_feedbackAmount.textContent    = (fs.feedbackAmount    ?? 0.92).toFixed(2);
        state.select_feedbackMaskType.value      = fs.feedbackMaskType   ?? 0;
        state.select_feedbackModType.value       = fs.feedbackModType    ?? 0;
        state.range_feedbackModAmount.value      = fs.feedbackModAmount  ?? 0.3;
        state.span_feedbackModAmount.textContent = (fs.feedbackModAmount ?? 0.3).toFixed(2);
        state.select_feedbackOpOrder.value       = fs.feedbackOpOrder    ?? 0;
        state.checkbox_feedbackSwap.checked      = !!fs.feedbackSwap;
        state.range_feedbackSharpen.value        = fs.feedbackSharpen    ?? 0;
        state.span_feedbackSharpen.textContent   = (fs.feedbackSharpen   ?? 0).toFixed(2);
        state.range_feedbackBlur.value           = fs.feedbackBlur       ?? 0;
        state.span_feedbackBlur.textContent      = (fs.feedbackBlur      ?? 0).toFixed(2);

        // Chroma Key Sync
        if (state.select_feedbackChromaMode)
        {
            state.select_feedbackChromaMode.value     = fs.chromaMode ?? 0;
            state.range_feedbackChromaThreshold.value = fs.chromaThreshold ?? 0.1;
            state.span_feedbackChromaThreshold.textContent = (fs.chromaThreshold ?? 0.1).toFixed(2);
            state.range_feedbackChromaSoftness.value  = fs.chromaSoftness ?? 0.1;
            state.span_feedbackChromaSoftness.textContent  = (fs.chromaSoftness ?? 0.1).toFixed(2);
            state.div_chromaSettings.style.display    = (fs.feedbackMaskType === 6) ? 'block' : 'none';
            
            // RGB Vector3 to Hex Color
            const r = Math.round((fs.chromaKeyColor?.x ?? 0) * 255).toString(16).padStart(2, '0');
            const g = Math.round((fs.chromaKeyColor?.y ?? 1) * 255).toString(16).padStart(2, '0');
            const b = Math.round((fs.chromaKeyColor?.z ?? 0) * 255).toString(16).padStart(2, '0');
            state.input_feedbackChromaKeyColor.value  = `#${r}${g}${b}`;
        }
        
        if (state.checkbox_feedbackLock)
            state.checkbox_feedbackLock.checked = !!state.feedbackLocked;
    }
    
    // ── Feedback quick-toggle button state ──────────────────────────────────
    let hasFavorite = state.favoriteShader && state.favoriteShader.IsVariation();
    let feedbackOn  = state.favoriteShader && !!state.favoriteShader.useFeedback;
    if (state.button_feedback)
    {
        state.button_feedback.disabled         = !hasFavorite;
        state.button_feedback.style.background = feedbackOn ? '#4a4' : '';
        state.button_feedback.title            = feedbackOn ? 'Feedback ON [F]' : 'Feedback OFF [F]';
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
    
    let isMobile = IsMobile();
    if (isMobile || state.itchMode)
    {
        if (!state.itchMode)
            state.button_help.style.display = 'none';
        state.button_seed.style.display = 'inline';
        state.button_advanced.style.display = 'none';
        state.button_share.style.display = 'none';
        state.div_credit.style.display = 'none';
        state.button_openSatellite.style.display = 'none';
    }
    
    // set title
    let shader = state.shaderMemory[state.shaderMemoryLocation];
    document.title = `ZzArt - ` + shader.GetGenerationString();
    
    // resize canvas to fit window
    let a = state.canvas_main.width / state.canvas_main.height;
    let w = window.innerWidth - (isMobile||state.itchMode?20:100);
    let h = window.innerHeight - (state.itchMode?120:150);
    let wa = w/h;
    if (state.rotateCanvas)
        wa = 1/wa;
    if (wa > a)
        w = h * a;
    else
        h = w / a;
     
    state.canvas_main.style.width=w+'px';
    state.canvas_main.style.height=h+'px';
    state.canvas_shader.style.width=w+'px';
    state.canvas_shader.style.height=h+'px';

    SaveLocalStorage();
}

export function ChangeMemoryLocation(direction)
{
    if (state.shaderMemoryLocation + direction < 0 || state.shaderMemoryLocation + direction >= state.shaderMemory.length)
        return;
        
    if (state.showPreview)
    {
        state.showPreview = 0;
        UpdateUI();
        return;
    }
        
    state.shaderMemoryLocation+=direction;
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
        
    state.showPreview = 0;
    ++state.shaderMemoryLocation;
    state.shaderMemory.length=state.shaderMemoryLocation;
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
    if (seed==0)
        seed = 1; // prevent it from being black
    
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

    // Toggle the flag
    state.favoriteShader.useFeedback = state.favoriteShader.useFeedback ? 0 : 1;

    // Sync advanced panel checkbox
    if (state.checkbox_useFeedback)
        state.checkbox_useFeedback.checked = !!state.favoriteShader.useFeedback;

    // Clear accumulation when enabling (or when clearOnChange is set)
    if (state.feedbackClearOnChange || state.favoriteShader.useFeedback)
        ClearFeedback();

    // Start preview automatically when feedback is enabled
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
        // redraw the favorite shader
        state.canvas_shader.width = state.canvas_main.width;
        state.canvas_shader.height = state.canvas_main.height;
        if (state.favoriteShader && state.favoriteShader.IsVariation())
        {
            // clear accumulation buffer before first fullscreen render
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

    // save large (single pass – no feedback on export)
    let saveScale = parseInt(state.input_saveScale.value);
    if (saveScale <= 0)
        return;
    state.canvas_shader.width = saveScale*state.defaultCanvasWidth;
    state.canvas_shader.height = saveScale*state.defaultCanvasHeight;
    state.favoriteShader.Render(false);  // no feedback on save

    let canvas = state.canvas_shader;

    if (state.checkbox_showWatermark.checked)
    {
        canvas = state.canvas_save;
        canvas.width = state.canvas_shader.width;
        canvas.height = state.canvas_shader.height;
        let x = state.canvasContext_save;
        x.drawImage(state.canvas_shader, 0, 0);

        // watermark
        let watermarkText = `𝓩𝔃𝓐𝓻𝓽 ~ ${state.favoriteShader.GetGenerationString()} ~ zzart.3d2k.com`;
        let X = canvas.width-10;
        let Y = canvas.height-10;
        x.textAlign='right';
        x.shadowBlur = 6;
        x.shadowColor = '#0009';
        x.fillStyle = '#000';
        x.font = '30px monospace';
        for (let i=-1;i<=1;i+=2)
        for (let j=-1;j<=1;j+=2)
            x.fillText(watermarkText, X+1*i,Y+1*j);
        x.fillStyle='#fff';
        x.fillText(watermarkText, X,Y);
    }
    
    let filename = 'ZzArt-' + state.favoriteShader.GetGenerationString(1) + ".png";
    download(canvas.toDataURL("image/png"), filename,"image/png");
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
        // preserve feedback from previous favorite before randomizing
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
            state.favoriteShader.chromaKeyColor    = oldShader.chromaKeyColor.Clone? oldShader.chromaKeyColor.Clone() : Object.assign(new Vector3(), oldShader.chromaKeyColor);
            state.favoriteShader.chromaThreshold   = oldShader.chromaThreshold;
            state.favoriteShader.chromaSoftness    = oldShader.chromaSoftness;
        }
    }

    for(let i=9;i--;) Rand(); // warm up random number generator
    
    for(let X=0; X<state.gridSize; X++)
    for(let Y=0; Y<state.gridSize; Y++)
    {
        let shader = state.shaderGrid[X][Y] = state.favoriteShader.Clone();
        shader.SetGridPos(X,Y);
        shader.Randomize(keepFeedback);
    }
}

export function DrawShaders()
{
    let c = state.canvas_main;
    let ctx = state.canvasContext_main;

    // Increment and store current render ID to cancel any stale loops
    state.gridRenderId++;
    const currentRenderId = state.gridRenderId;
    
    // Clear and prepare render metadata
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

    // Start loop
    requestAnimationFrame(() => AnimateGridRender(currentRenderId));
}

function AnimateGridRender(renderId)
{
    // If a newer render has started, abort this one
    if (renderId !== state.gridRenderId) return;

    const ctx = state.canvasContext_main;
    const c = state.canvas_main;
    const G = state.gridSize;
    const gap = 10;
    const SX = (c.width - gap) / G;
    const SY = (c.height - gap) / G;
    const W = (c.width - gap * (G + 1)) / G;
    const H = (c.height - gap * (G + 1)) / G;

    // Process up to 2 items per frame to keep it snappy but responsive
    for (let i = 0; i < 2; i++)
    {
        if (state.gridRenderQueue.length > 0)
        {
            const {x, y} = state.gridRenderQueue.shift();
            const shader = state.shaderGrid[x][y];
            
            // Render the shader to the shared offscreen canvas
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

            // Copy the result to the cell's private cache canvas
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

    // Clear main canvas for redraw
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

        // Selection box (if favorite)
        const fs = state.favoriteShader;
        if (fs && fs.gridPosX === record.x && fs.gridPosY === record.y)
        {
            ctx.beginPath();
            ctx.rect(posX - gap / 2, posY - gap / 2, W + gap, H + gap);
            ctx.lineWidth = 7;
            ctx.strokeStyle = '#f00';
            ctx.stroke();
        }
        
        // Cell border
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
    // Clear feedback accumulation buffer when the active shader changes
    if (state.feedbackClearOnChange)
        ClearFeedback();

    // Copy current feedback settings to the selected variation if locked
    // This allows manually tuned settings to carry over to the next generation
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
        target.chromaKeyColor    = source.chromaKeyColor.Clone? source.chromaKeyColor.Clone() : Object.assign(new Vector3(), source.chromaKeyColor);
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
    state.textarea_code.value = state.favoriteShader.GetCode();
    state.textarea_json.value = btoa(JSON.stringify(state.favoriteShader));
        
    for(let X=0; X<state.gridSize; X++)
    for(let Y=0; Y<state.gridSize; Y++)
    {
        let shader = state.shaderGrid[X][Y] = state.favoriteShader.Clone();
        shader.SetGridPos(X,Y);
        
        if (X!=skipX || Y!=skipY)
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
    state.showPreview = 0;
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
        shader.SetGridPos(X,Y);
    }
    
    if (state.saveListIndex >= state.saveList.length)
        state.saveListIndex = 0;

    DrawShaders();
    UpdateUI();
}

export function UpdateSatelliteMode()
{ 
    // continuous poll favorite from local storage
    let localStorageItem = localStorage.saveData;
    if (localStorageItem)
    {
        let saveData = JSON.parse(localStorageItem);
        if (saveData.lastUpdate != state.lastSatelliteUpdate)
        {
            state.lastSatelliteUpdate = saveData.lastUpdate;
            let rawObject = saveData.favorite;
            
            // redraw new favorite
            if (state.feedbackClearOnChange || rawObject.uniqueID != state.favoriteShader?.uniqueID)
                ClearFeedback();
            state.favoriteShader = Object.assign(new ShaderObject(), rawObject).Clone();
            state.span_generationsSatellite.innerHTML = state.favoriteShader.GetGenerationString();
        }
    }
}

export function InitSatelliteMode()
{
    // redraw the favorite shader
    state.canvas_shader.width = state.canvas_main.width;
    state.canvas_shader.height = state.canvas_main.height;
    state.favoriteShader.randSeed = 0;
       
    // set ui for satellite mode
    state.canvas_shader.style = 'position:absolute; left:0px; top:0px;width:100%;height:100%'
    state.canvas_shader.style.zIndex = 10;
    state.canvas_main.hidden = 1;
    state.canvas_shader.hidden = 0;
    state.buttons_top.style.display = 'none';
    state.div_credit.style.display = 'none';
    state.div_title.style.display = 'none';
    state.div_title.style.display = 'none';
    state.div_satellite.style.display = 'inline';
    
    function Animate() {
        if (state.satelliteMode) {
            state.favoriteShader.Render(true);  // satellite always renders with feedback
            requestAnimationFrame(Animate);
        }
    }
    requestAnimationFrame(Animate);
    
    setInterval(UpdateSatelliteMode, 100);
}

export function TryToRotate()
{
    // rotate canvas if window is more vertical then horizontal
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

export function UpdatePipelineUI()
{
    console.log("Updating Pipeline UI...");
    if (!state.favoriteShader || !state.div_pipelineSourceCode || !state.div_pipelineFeedbackCode)
        return;

    const fs = state.favoriteShader;
    const isFeedbackActive = !!fs.useFeedback;

    // 1. Get Source Code (Pass 1)
    const sourceCode = fs.GetCode();
    state.div_pipelineSourceCode.innerHTML = highlightShader(sourceCode);

    // 2. Update Feedback Loop Visibility
    if (state.div_feedbackLoopContainer)
    {
        state.div_feedbackLoopContainer.style.opacity = isFeedbackActive ? '1' : '0.3';
        state.svg_feedbackLoopPath.style.opacity = isFeedbackActive ? '1' : '0';
        state.div_bufferHistoryNodes.style.opacity = isFeedbackActive ? '1' : '0.2';
        state.div_pipelineOutputConnection.style.opacity = isFeedbackActive ? '1' : '0.2';
    }

    // 3. Build Feedback Code (Pass 2)
    const w = state.canvas_main.width;
    const h = state.canvas_main.height;
    
    const feedbackCode = buildCompositeShader(
        fs.feedbackBlendMode  ?? 0,
        fs.feedbackMaskType   ?? 0,
        fs.feedbackModType    ?? 0,
        fs.feedbackOpOrder    ?? 0,
        fs.feedbackSharpen    ?? 0,
        fs.feedbackBlur       ?? 0,
        w, h
    );
    state.div_pipelineFeedbackCode.innerHTML = highlightShader(feedbackCode);

    // 4. Update Node Parameters (Tags)
    if (state.div_nodeCompositorParams)
    {
        const blendNames = ['Mix', 'Add', 'Mult', 'Screen', 'Diff', 'Light', 'Dark', 'Burn', 'Atop'];
        const maskNames  = ['None', 'Lum', 'Red', 'Edge', 'HueDist', 'Alpha', 'Chroma'];
        const modNames   = ['None', 'Distort', 'Displace', 'Zoom', 'Rotate'];
        const orderNames = ['Std', 'MskGt', 'InvGt', 'WrpMsk', 'MskUV', 'ModAmt'];

        let tags = '';
        tags += `<span class="node-param-tag active">Blend: ${blendNames[fs.feedbackBlendMode ?? 0]}</span>`;
        tags += `<span class="node-param-tag active">Mask: ${maskNames[fs.feedbackMaskType ?? 0]}</span>`;
        tags += `<span class="node-param-tag active">Mod: ${modNames[fs.feedbackModType ?? 0]}</span>`;
        tags += `<span class="node-param-tag active">Order: ${orderNames[fs.feedbackOpOrder ?? 0]}</span>`;
        
        if (fs.feedbackSharpen > 0) tags += `<span class="node-param-tag active" style="color:#F85">Sharp</span>`;
        if (fs.feedbackBlur > 0)    tags += `<span class="node-param-tag active" style="color:#5AF">Blur</span>`;
        
        state.div_nodeCompositorParams.innerHTML = tags;
    }

    // 5. Update Buffer Status
    if (state.div_bufferHistoryNodes)
    {
        const tags = state.div_bufferHistoryNodes.querySelectorAll('.buffer-tag');
        if (tags.length >= 2)
        {
            // feedbackIndex is which slot is "previous" history
            // we highlight the one currently being read as history
            tags[0].classList.toggle('active', state.feedbackIndex === 1);
            tags[1].classList.toggle('active', state.feedbackIndex === 2);
        }
    }
}

function highlightShader(code) {
    if (!code) return '';
    
    // Escape HTML (simple)
    let escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Keywords
    const keywords = ['precision', 'mediump', 'highp', 'float', 'uniform', 'const', 'attribute', 'varying', 'void', 'main', 'return', 'if', 'else', 'for', 'while', 'discard', 'break', 'continue'];
    const types = ['vec2', 'vec3', 'vec4', 'mat2', 'mat3', 'mat4', 'sampler2D', 'int', 'bool'];
    const functions = ['mainImage', 'texture2D', 'mix', 'clamp', 'length', 'sin', 'cos', 'dot', 'abs', 'floor', 'fract', 'step', 'smoothstep', 'distance', 'pow', 'sqrt', 'inversesqrt', 'asin', 'acos', 'atan', 'normalize'];
    const uniforms = ['iTime', 'iResolution', 'iCurrent', 'iPrevious', 'iFeedbackAmount', 'iFeedbackModAmount', 'iChromaKeyColor', 'iChromaThreshold', 'iChromaSoftness', 'iChromaMode'];

    // Numbers (positive only, to avoid complex negative handling for now)
    escaped = escaped.replace(/\b(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\b/g, '<span class="sh-number">$1$2</span>');

    // Keywords
    keywords.forEach(k => {
        const re = new RegExp(`\\b${k}\\b`, 'g');
        escaped = escaped.replace(re, `<span class="sh-keyword">${k}</span>`);
    });

    // Types
    types.forEach(t => {
        const re = new RegExp(`\\b${t}\\b`, 'g');
        escaped = escaped.replace(re, `<span class="sh-type">${t}</span>`);
    });

    // Functions
    functions.forEach(f => {
        const re = new RegExp(`\\b${f}\\b`, 'g');
        escaped = escaped.replace(re, `<span class="sh-func">${f}</span>`);
    });

    // Uniforms
    uniforms.forEach(u => {
        const re = new RegExp(`\\b${u}\\b`, 'g');
        escaped = escaped.replace(re, `<span class="sh-uniform">${u}</span>`);
    });

    // Comments (simple single line/multi)
    escaped = escaped.replace(/(\/\/.*)/g, '<span class="sh-comment">$1</span>');
    
    return escaped;
}
