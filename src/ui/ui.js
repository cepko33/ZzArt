import { state } from '../state';
import { Rand, RandInt, RandSeeded, HashString, Clamp, IsMobile } from '../utils/math';
import { ShaderObject } from '../shader/ShaderObject';
import { AddToSaveList, DeleteSelectedSave, ExportSaveList, SaveLocalStorage } from '../storage';
import download from '../utils/download';
import { JSONCrush } from '../utils/jsonCrush';

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
    state.div_advanced.style.display = state.advancedMode? 'inline' : 'none';
    state.button_delete.style.display = state.advancedMode? 'inline' : 'none';
    state.button_help.style.display = state.advancedMode? 'none' : 'inline';
    state.textarea_debug.hidden = state.textarea_debug.value == '';
    state.button_saveFolder.style.display = state.saveList.length==0? 'none' : 'inline';
    
    let s = state.shaderMemory[state.shaderMemoryLocation];
    state.span_generations.innerHTML = s.GetGenerationString();
    
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
    RandomizeShaders();
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
            state.favoriteShader.Render();
    }
        
    UpdateUI();
}

export function ButtonSave()
{
    if (!state.favoriteShader)
        return;

    AddToSaveList(state.favoriteShader);

    // save large
    let saveScale = parseInt(state.input_saveScale.value);
    if (saveScale <= 0)
        return;
    state.canvas_shader.width = saveScale*state.defaultCanvasWidth;
    state.canvas_shader.height = saveScale*state.defaultCanvasHeight;
    state.favoriteShader.Render();

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

export function RandomizeShaders()
{
    state.saveListIndex = 0;
    state.favoriteShader = new ShaderObject();
    for(let i=9;i--;) Rand(); // warm up random number generator
    
    for(let X=0; X<state.gridSize; X++)
    for(let Y=0; Y<state.gridSize; Y++)
    {
        let shader = state.shaderGrid[X][Y] = state.favoriteShader.Clone();
        shader.SetGridPos(X,Y);
        shader.Randomize();
    }
}

export function DrawShaders()
{
    let x = state.canvasContext_main;
    let c = state.canvas_main;
    c.width|=0;
    
    let gap = 10;
    let G = state.gridSize;
    let SX = (c.width-gap)/G;
    let SY = (c.height-gap)/G;
    let W = (c.width - gap*(state.gridSize+1))/G;
    let H = (c.height - gap*(state.gridSize+1))/G;
    
    // use small hight for previews
    state.canvas_shader.width = W;
    state.canvas_shader.height = H;
    
    for(let X=0; X<G; X++)
    for(let Y=0; Y<G; Y++)
    {
        let shader = state.shaderGrid[X][Y];
        shader.Render();
        
        let posX = gap+SX*X;
        let posY = gap+SY*Y;
        x.drawImage(state.canvas_shader, posX, posY, W, H);
        x.beginPath()
        x.rect(posX,posY,W,H);
        x.lineWidth=2;
        x.strokeStyle='#000';
        x.stroke();
    }
        
    if (state.favoriteShader.gridPosX >=0 && state.favoriteShader.gridPosY >=0)
    {
        let posX = gap+SX*state.favoriteShader.gridPosX;
        let posY = gap+SY*state.favoriteShader.gridPosY;
        x.beginPath()
        x.rect(posX-gap/2,posY-gap/2,W+gap,H+gap);
        x.lineWidth=7;
        x.strokeStyle='#f00';
        x.stroke();
    }
}

export function SetBest(bestX, bestY)
{
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
        let saveData = JSON.parse(localStorage.saveData);
        let rawObject = saveData.favorite;
        if (rawObject.uniqueID != state.favoriteShader.uniqueID)
        {
            // redraw new favorite
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
            state.favoriteShader.Render();
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
