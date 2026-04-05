import { state } from '../../state';
import { ControlRow } from '../ControlRow';
import { SetGridSize } from '../../ui/ui';

export const GeneralSettings = {
    render() {
        return (
            <details class="advanced-group" open>
                <summary>⚙️ Settings & 💾 Saves</summary>
                <div class="control-row">
                    <label><input type="checkbox" v-model={state.settings.showWatermark} /> Watermark</label>
                    <label><input type="checkbox" v-model={state.feedback.clearOnChange} /> Clear on Change</label>
                </div>
                <ControlRow label="Save Scale">
                    <input type="number" v-model={state.settings.saveScale} class="advanced" />
                </ControlRow>
                <ControlRow label="Grid Size">
                    <input 
                        type="number" 
                        value={state.gridSize} 
                        onInput={(e) => SetGridSize(parseInt(e.target.value))} 
                        class="advanced" 
                    />
                </ControlRow>
                <ControlRow label="Start Iters">
                    <input type="number" v-model={state.startIterations} class="advanced" />
                </ControlRow>
                <ControlRow label="Rand Len">
                    <input type="number" v-model={state.settings.randomizeLength} class="advanced" />
                </ControlRow>
                {this.$slots.default?.()}
            </details>
        );
    }
};
