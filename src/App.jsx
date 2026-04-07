import { onMounted, onUnmounted, ref, watch } from 'vue';
import { state } from './state';
import { UpdateUI } from './ui/ui';
import Toolbar from './components/Toolbar.jsx';
import AdvancedPanel from './components/AdvancedPanel.jsx';
import { SatelliteControls } from './components/App/SatelliteControls';

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

            // Update window dimensions
            const handleResize = () => {
                state.windowWidth = window.innerWidth;
                state.windowHeight = window.innerHeight;
            };
            window.addEventListener('resize', handleResize);
            onUnmounted(() => window.removeEventListener('resize', handleResize));
        });

        // Watchers for visual state changes that need manual canvas updates
        watch(
            () => state.showPreview,
            () => {
                UpdateUI();
            }
        );

        return {
            state,
            canvasMain,
            canvasShader,
            canvasSave,
        };
    },
    render() {
        const { state } = this;

        // Calculate responsive dimensions
        let canvasStyle = {
            width: '1280px',
            height: '720px',
        };

        if (state.canvas_main) {
            const aspect = state.canvas_main.width / state.canvas_main.height;
            const marginW = state.itchMode ? 20 : 60;
            const marginH = state.itchMode ? 120 : 180;
            let w = state.windowWidth - marginW;
            let h = state.windowHeight - marginH;

            if (w / h > aspect) {
                w = h * aspect;
            } else {
                h = w / aspect;
            }
            canvasStyle.width = `${Math.floor(w)}px`;
            canvasStyle.height = `${Math.floor(h)}px`;
        }

        return (
            <div class={['app-container', state.satelliteMode ? 'satellite-mode' : '']}>
                {/* Satellite Mode View */}
                {state.satelliteMode && <SatelliteControls />}

                <div style={{ textAlign: 'center' }}>
                    {!state.satelliteMode && (
                        <>
                            <div id="div_title">
                                <span>{state.favoriteShader?.GetGenerationString() || 0}</span>
                            </div>
                            <Toolbar />
                        </>
                    )}

                    <canvas
                        ref="canvasMain"
                        id="canvas_main"
                        width="1080"
                        height="1080"
                        style={{
                            width: state.satelliteMode ? '100vw' : canvasStyle.width,
                            height: state.satelliteMode ? '100vh' : canvasStyle.height,
                            border: state.satelliteMode ? 'none' : '1px dotted black',
                            display: state.showPreview || state.satelliteMode ? 'none' : 'block',
                            margin: '0 auto',
                        }}
                    ></canvas>

                    <canvas
                        ref="canvasShader"
                        id="canvas_shader"
                        style={{
                            width: state.satelliteMode ? '100vw' : canvasStyle.width,
                            height: state.satelliteMode ? '100vh' : canvasStyle.height,
                            border: state.satelliteMode ? 'none' : '2px solid black',
                            display: state.showPreview || state.satelliteMode ? 'block' : 'none',
                            margin: '0 auto',
                        }}
                    ></canvas>

                    <canvas
                        ref="canvasSave"
                        id="canvas_save"
                        hidden
                        style={{
                            width: '1280px',
                            height: '720px',
                            border: '2px solid black',
                        }}
                    ></canvas>

                    {!state.satelliteMode && state.advancedMode && <AdvancedPanel />}
                </div>
            </div>
        );
    },
};
