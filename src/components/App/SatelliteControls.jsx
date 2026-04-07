import { state } from '../../state';
import { ButtonSatelliteHelp, ButtonSave, ButtonToggleFeedback } from '../../ui/ui';

export const SatelliteControls = {
    render() {
        return (
            <div id="div_satellite" class="satellite">
                <button class="satellite" onClick={ButtonSatelliteHelp} title="Help">
                    📡
                </button>
                <button class="satellite" onClick={ButtonSave} title="Save HD Image [S]">
                    💾
                </button>
                <button class="satellite" onClick={ButtonToggleFeedback} title="Toggle Feedback">
                    🌀
                </button>
                <span style={{ fontSize: '2em' }}>
                    <span>{state.favoriteShader?.GetGenerationString() || 0}</span>
                </span>
                <br />
            </div>
        );
    },
};
