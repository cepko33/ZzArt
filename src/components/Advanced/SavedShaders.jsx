import { state } from '../../state';
import { SelectSavedShader, ExportSaveList, DeleteSelectedSave } from '../../storage';
import { OpenCapJS } from '../../ui/ui';

export const SavedShaders = {
    render() {
        return (
            <div>
                <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '10px', fontWeight: 'bold', color: '#5AF' }}>💾 Saved Shaders</div>
                <select 
                    id="select_saveList" 
                    onChange={(e) => SelectSavedShader(e.target.selectedIndex)} 
                    size={6} 
                    style={{ width: '100%', marginBottom: '10px' }}
                >
                    {state.saveList.map((s, i) => (
                        <option key={i} value={i}>{s.GetGenerationString()}</option>
                    ))}
                </select>
                
                <div class="buttons-group">
                    <button class="action-button" onClick={OpenCapJS}>CapJS</button>
                    <button class="action-button" onClick={ExportSaveList}>Export</button>
                    <button class="action-button" onClick={() => document.getElementById('input_importFile').click()}>Import</button>
                    <input id="input_importFile" type="file" style={{ display: 'none' }} />
                    <button class="action-button danger" onClick={DeleteSelectedSave}>Delete</button>
                </div>
            </div>
        );
    }
};
