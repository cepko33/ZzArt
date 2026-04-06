import { state } from './state';
import { ShaderObject } from './shader/ShaderObject';
import { UpdateUI, DrawShaders, SetFavoriteFromMemory, DisplaySaveListPage } from './ui/ui';
import download from './utils/download';
import { setCookie, getCookie } from './utils/cookie';

export function SaveLocalStorage()
{
    if (state.satelliteMode)
        return;
        
    let saveData = 
    {
        version: state.config.dataVersion,
        showWatermark: state.settings.showWatermark,
        advancedMode: state.advancedMode,
        gridSize: state.gridSize,
        favorite: state.favoriteShader,
        simulationSpeed: state.settings.simulationSpeed,
        lastUpdate: Date.now()
    }
        
    localStorage.version = state.config.dataVersion;
    localStorage.saveData = JSON.stringify(saveData);
}

export function LoadLocalStorage()
{
    if (localStorage.version != state.config.dataVersion)
        return;
        
    let saveData = JSON.parse(localStorage.saveData);
    state.settings.showWatermark = saveData.showWatermark;
    state.advancedMode = saveData.advancedMode;
    state.gridSize = saveData.gridSize;
    
    let rawObject = saveData.favorite;
    if (rawObject) {
        state.favoriteShader = Object.assign(new ShaderObject(), rawObject).Clone();
    }
}

export function SaveSettingsToCookie()
{
    if (state.satelliteMode)
        return;

    let settings = {
        showWatermark: state.settings.showWatermark,
        feedbackClear: state.feedback.clearOnChange,
        saveScale: state.settings.saveScale,
        gridSize: state.gridSize,
        startIterations: state.startIterations,
        advancedMode: state.advancedMode,
        simulationSpeed: state.settings.simulationSpeed
    };

    setCookie('zzart_settings', JSON.stringify(settings), 365);
}

export function LoadSettingsFromCookie()
{
    let cookie = getCookie('zzart_settings');
    if (!cookie) return;

    try {
        let settings = JSON.parse(cookie);
        if (settings.showWatermark !== undefined) state.settings.showWatermark = settings.showWatermark;
        if (settings.feedbackClear !== undefined) {
            state.feedback.clearOnChange = settings.feedbackClear;
        }
        if (settings.saveScale !== undefined) state.settings.saveScale = settings.saveScale;
        if (settings.gridSize !== undefined) {
            state.gridSize = parseInt(settings.gridSize);
        }
        if (settings.startIterations !== undefined) {
            state.startIterations = parseInt(settings.startIterations);
        }
        if (settings.advancedMode !== undefined) {
            state.advancedMode = settings.advancedMode;
        }
        if (settings.simulationSpeed !== undefined) {
            state.settings.simulationSpeed = parseFloat(settings.simulationSpeed);
        }
    } catch (e) {
        console.error("Failed to parse settings cookie", e);
    }
}

export function LoadSavedShaderList()
{
    state.saveList = [];
    let savedShaderCount = localStorage.savedShaderCount;
    if (!savedShaderCount)
    {
        savedShaderCount = 0;
        return;
    }
    for(let i=0; i<savedShaderCount; ++i)
    {
        let rawObject = localStorage['savedShader_'+i];
        if (!rawObject)
            continue;
            
        rawObject = JSON.parse(rawObject);
        let shader = Object.assign(new ShaderObject(), rawObject).Clone();
        AddToSaveList(shader, 0);
    }
}

export function SaveShaderList()
{
    let i=0;
    localStorage.savedShaderCount = state.saveList.length;
    for(let shader of state.saveList)
    {
        localStorage['savedShader_'+i] = JSON.stringify(shader);
        ++i;
    }
}

export function SelectSavedShader(i)
{
    i = parseInt(i);
    if (i >= state.saveList.length)
        return;
 
    if (state.saveList[i].IsSaveList())
        return;
 
    state.saveListIndex = i;
    state.shaderMemoryLocation = state.shaderMemory.length;
    let shader = state.saveList[i].Clone();
    shader.gridPosX = 0;
    shader.gridPosY = 0;
    state.shaderMemory[state.shaderMemoryLocation] = shader;
    SetFavoriteFromMemory();
    
    DrawShaders();
    UpdateUI();
}

export function AddToSaveList(shader, save=1)
{
    // check if duplicate
    let matches = state.saveList.filter(savedShader => savedShader.uniqueID == shader.uniqueID);
    if (matches.length)
        return;

    state.saveList.push(shader.Clone());
    if (save)
    {
        let i = state.saveList.length - 1;
        localStorage['savedShader_'+i] = JSON.stringify(shader);
        localStorage.savedShaderCount = state.saveList.length;
    }
}

export function DeleteSelectedSave()
{
    // If we have a selection in the UI (managed by state logic or component)
    // For now we use the favorite shader uniqueID to find it if no index passed
    // But usually this is called from SelectSavedShader or a specific UI action
    
    // Legacy logic used select_saveList.selectedIndex
    // In Vue, we should probably pass the index or use a reactive selection
    // For now, let's assume we delete the current favorite if it's in the list
    
    let i = state.saveList.findIndex(s => s.uniqueID === state.favoriteShader?.uniqueID);
    if (i === -1) return;
    
    state.saveList.splice(i, 1);
    SaveShaderList();
    UpdateUI();
}

export function ExportSaveList()
{
    let filename = 'zzart_export.txt';
    let output = '';
    for (let shader of state.saveList)
        output += JSON.stringify(shader) + '\n';
    
    download(output, filename, "data:application/octet-stream");
}

export function ImportSaveList(file)
{
    if (file.type != "text/plain")
        return;
        
    let reader = new FileReader();
    reader.readAsText(file,'UTF-8');
    reader.onload = readerEvent =>
    {
        state.saveList = [];
        state.saveListIndex = 0;
            
        let content = readerEvent.target.result;
        let jsonLines = content.split('\n');
        for (let line of jsonLines)
        {
            try
            {
                let jsonShader = JSON.parse(line);
                let shader = Object.assign(new ShaderObject(), jsonShader).Clone();
                AddToSaveList(shader, 0);
            }
            catch (e) 
            {
                break;
            }
        }
        
        SaveShaderList();
        DisplaySaveListPage(0);
        
        state.shaderMemoryLocation = 0;
        state.shaderMemory.length = state.shaderMemoryLocation;
        state.shaderMemory.push(state.favoriteShader.Clone());
        UpdateUI();
    }
}
