import { state } from './state';
import { ShaderObject } from './shader/ShaderObject';
import { UpdateUI, DrawShaders, SetFavoriteFromMemory, DisplaySaveListPage } from './ui/ui';
import download from './utils/download';

export function SaveLocalStorage()
{
    if (state.satelliteMode)
        return;
        
    let shader = state.shaderMemory[state.shaderMemoryLocation];
    let saveData = 
    {
        version: state.dataVersion,
        showWatermark: state.checkbox_showWatermark.checked,
        advancedMode: state.advancedMode,
        gridSize: state.gridSize,
        favorite: shader
    }
        
    localStorage.version = state.dataVersion;
    localStorage.saveData = JSON.stringify(saveData);
}

export function LoadLocalStorage()
{
    if (localStorage.version != state.dataVersion)
        return;
        
    let saveData = JSON.parse(localStorage.saveData);
    state.checkbox_showWatermark.checked = saveData.showWatermark;
    state.advancedMode = saveData.advancedMode;
    state.input_gridSize.value = state.gridSize = saveData.gridSize;
    
    let rawObject = saveData.favorite;
    state.favoriteShader = Object.assign(new ShaderObject(), rawObject).Clone();
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
    for(let i=0;i<savedShaderCount;++i)
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
    UpdateUI(0);
}

export function AddToSaveList(shader, save=1)
{
    // check if duplicate
    let matches = state.saveList.filter(savedShader => savedShader.uniqueID == shader.uniqueID);
    if (matches.length)
        return;

    let i = state.saveList.length;
    let option = document.createElement('option');
    option.value = i;
    option.innerHTML = shader.GetGenerationString(1);
    state.select_saveList.appendChild(option);
    state.saveList.push(shader.Clone());
    if (save)
    {
        localStorage['savedShader_'+i] = JSON.stringify(shader);
        localStorage.savedShaderCount = state.saveList.length;
    }
}

export function DeleteSelectedSave()
{
    let options = state.select_saveList.getElementsByTagName('option');
    let i = state.select_saveList.selectedIndex;
    if (i < 0 || i >= options.length)
    {
        // check if current favorite
        i = 0;
        for (let shader of state.saveList)
        {
            if (shader.uniqueID == state.favoriteShader.uniqueID)
                break;
                
            ++i;
        }
        
        if (i == state.saveList.length)
            return;
    }
    
    state.saveList.splice(i, 1);
    options[i].remove();
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
    reader.onload=readerEvent=>
    {
        state.saveList = [];
        state.saveListIndex = 0;
        state.select_saveList.options.length = 0;
            
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
        
        state.shaderMemoryLocation=0;
        state.shaderMemory.length = state.shaderMemoryLocation;
        state.shaderMemory.push(state.favoriteShader.Clone());
        UpdateUI();
    }
}
