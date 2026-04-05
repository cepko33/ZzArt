import { state } from '../state';
import { 
    ButtonTogglePreview, ButtonToggleFeedback, ChangeMemoryLocation, 
    ButtonSave, DisplaySaveListPage, ButtonRandomize, 
    ButtonShare, ButtonSatellite, ButtonAdvanced, ButtonHelp
} from '../ui/ui';
import { DeleteSelectedSave } from '../storage';

export default {
    render() {
        return (
            <div id="buttons_top">
                <button 
                    class="small" 
                    id="button_preview" 
                    disabled={!state.favoriteShader} 
                    onClick={ButtonTogglePreview} 
                    title="Toggle Preview [Spacebar]"
                >🔍</button>
                <button 
                    class="small" 
                    id="button_feedback" 
                    disabled={!state.favoriteShader} 
                    onClick={ButtonToggleFeedback} 
                    title="Toggle Feedback [F]"
                    style={{ background: state.favoriteShader?.useFeedback ? '#4a4' : '' }}
                >🌀</button>
                <button 
                    class="small" 
                    id="button_back" 
                    disabled={state.shaderMemoryLocation <= 0} 
                    onClick={() => ChangeMemoryLocation(-1)} 
                    title="Undo [Z]"
                >◄</button>
                <button 
                    class="small" 
                    id="button_forward" 
                    disabled={state.shaderMemoryLocation >= state.shaderMemory.length - 1} 
                    onClick={() => ChangeMemoryLocation(1)} 
                    title="Redo [X]"
                >►</button>
                <button 
                    class="small" 
                    id="button_save" 
                    onClick={ButtonSave} 
                    title="Save HD Image [S]"
                >💾</button>
                <button 
                    class="small" 
                    style={{ display: state.saveList.length === 0 ? 'none' : 'inline' }} 
                    id="button_saveFolder" 
                    onClick={DisplaySaveListPage} 
                    title="Show Next Save Folder Page"
                >📁</button>
                <button 
                    class="small" 
                    id="button_randomize" 
                    onClick={ButtonRandomize} 
                    title="Randomize [R]"
                >🎲</button>
                <button 
                    class="small" 
                    id="button_share" 
                    onClick={ButtonShare} 
                    title="Copy Link To Clipboard"
                >🔗</button>
                <button 
                    class="small" 
                    id="button_openSatellite" 
                    onClick={ButtonSatellite} 
                    title="Open Satellite Preview"
                >📡</button>
                <button 
                    class="small" 
                    id="button_advanced" 
                    onClick={ButtonAdvanced} 
                    title="Advanced Controls"
                >🔧</button>
                {!state.advancedMode && <button class="small" id="button_help" onClick={ButtonHelp} title="Help">❓</button>}
                {state.advancedMode && <button class="small" id="button_delete" onClick={DeleteSelectedSave} title="Delete Selected Save">␡</button>}
                <br />
            </div>
        );
    }
};
