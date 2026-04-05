import { onMounted, ref, watch } from 'vue';
import { state } from './state';
import { 
    ButtonSatelliteHelp, ButtonSave, ButtonToggleFeedback, 
    UpdateUI
} from './ui/ui';
import Toolbar from './components/Toolbar.jsx';
import AdvancedPanel from './components/AdvancedPanel.jsx';

export default {
    setup() {
        const canvasMain = ref(null);
        const canvasShader = ref(null);
        const canvasSave = ref(null);

        onMounted(() => {
            // Assign refs to state
            state.contexts.main = canvasMain.value.getContext('2d');
            state.contexts.shader = canvasShader.value.getContext('webgl');
            state.contexts.save = canvasSave.value.getContext('2d');
            
            // Sync initial state props that were DOM-linked
            state.canvas_main = canvasMain.value;
            state.canvas_shader = canvasShader.value;
            state.canvas_save = canvasSave.value;
        });

        // Watchers for visual state changes that need manual canvas updates
        watch(() => state.showPreview, () => {
            UpdateUI();
        });

        return {
            state,
            canvasMain,
            canvasShader,
            canvasSave,
            ButtonSatelliteHelp,
            ButtonSave,
            ButtonToggleFeedback,
        };
    },
    render() {
        const { state } = this;
        
        return (
            <div class="app-container">
                {/* Satellite Mode View */}
                {state.satelliteMode ? (
                    <div id="div_satellite" class="satellite">
                        <button class="satellite" onClick={this.ButtonSatelliteHelp} title="Help">📡</button>
                        <button class="satellite" onClick={this.ButtonSave} title="Save HD Image [S]">💾</button>
                        <button class="satellite" onClick={this.ButtonToggleFeedback} title="Toggle Feedback">🌀</button>
                        <span style={{ fontSize: '2em' }}><b>𝓩𝔃𝓐𝓻𝓽</b> - <span>{state.favoriteShader?.GetGenerationString() || 0}</span></span>
                        <br />
                    </div>
                ) : null}

                {/* Main UI */}
                {!state.satelliteMode && (
                    <div style={{ textAlign: 'center' }}>
                        <div id="div_title">
                            <span style={{ fontSize: '1.5em' }}><b>𝓩𝔃𝓐𝓻𝓽</b></span> - <span>{state.favoriteShader?.GetGenerationString() || 0}</span>
                        </div>
                        
                        <Toolbar />

                        <canvas 
                            ref="canvasMain" 
                            id="canvas_main" 
                            width="1920" 
                            height="1080" 
                            style={{ 
                                width: '1280px', 
                                height: '720px', 
                                border: '2px solid black',
                                display: state.showPreview ? 'none' : 'block'
                            }}
                        ></canvas>
                        
                        <canvas 
                            ref="canvasShader" 
                            id="canvas_shader" 
                            style={{ 
                                width: '1280px', 
                                height: '720px', 
                                border: '2px solid black',
                                display: state.showPreview ? 'block' : 'none'
                            }}
                        ></canvas>
                        
                        <canvas 
                            ref="canvasSave" 
                            id="canvas_save" 
                            hidden 
                            style={{ width: '1280px', height: '720px', border: '2px solid black' }}
                        ></canvas>
                        
                        <br />
                        <div id="div_credit">
                            <span style={{ fontSize: '1em' }}>ZzArt © <a href="http://www.frankforce.com" target="_blank">Frank Force</a> 2019 ☮♥☻␌</span>
                        </div>

                        {state.advancedMode && <AdvancedPanel />}
                    </div>
                )}

                {/* GitHub Corner */}
                <a href="https://github.com/KilledByAPixel/ZzArt" target="_blank" class="github-corner" aria-label="View source on GitHub">
                    <svg width="80" height="80" viewBox="0 0 250 250" style={{ fill: '#5AF', color: '#222', position: 'absolute', top: 0, border: 0, right: 0 }} aria-hidden="true">
                        <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path>
                        <path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" style={{ transformOrigin: '130px 106px' }} class="octo-arm"></path>
                        <path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" class="octo-body"></path>
                    </svg>
                </a>
            </div>
        );
    }
};
