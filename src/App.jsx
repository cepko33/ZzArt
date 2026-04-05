import { onMounted, ref, watch } from "vue";
import { state } from "./state";
import { UpdateUI } from "./ui/ui";
import Toolbar from "./components/Toolbar.jsx";
import AdvancedPanel from "./components/AdvancedPanel.jsx";
import { SatelliteControls } from "./components/App/SatelliteControls";

export default {
  setup() {
    const canvasMain = ref(null);
    const canvasShader = ref(null);
    const canvasSave = ref(null);

    onMounted(() => {
      // Assign refs to state
      state.contexts.main = canvasMain.value.getContext("2d");
      state.contexts.shader = canvasShader.value.getContext("webgl");
      state.contexts.save = canvasSave.value.getContext("2d");

      // Sync initial state props that were DOM-linked
      state.canvas_main = canvasMain.value;
      state.canvas_shader = canvasShader.value;
      state.canvas_save = canvasSave.value;
    });

    // Watchers for visual state changes that need manual canvas updates
    watch(
      () => state.showPreview,
      () => {
        UpdateUI();
      },
    );

    return {
      state,
      canvasMain,
      canvasShader,
      canvasSave
    };
  },
  render() {
    const { state } = this;

    return (
      <div class="app-container">
        {/* Satellite Mode View */}
        {state.satelliteMode && <SatelliteControls />}

        {/* Main UI */}
        {!state.satelliteMode && (
          <div style={{ textAlign: "center" }}>
            <div id="div_title">
              <span>{state.favoriteShader?.GetGenerationString() || 0}</span>
            </div>

            <Toolbar />

            <canvas
              ref="canvasMain"
              id="canvas_main"
              width="1920px"
              height="1080px"
              style={{
                width: "1280px",
                height: "720px",
                border: "2px solid black",
                display: state.showPreview ? "none" : "block",
              }}
            ></canvas>

            <canvas
              ref="canvasShader"
              id="canvas_shader"
              style={{
                width: "1280px",
                height: "720px",
                border: "2px solid black",
                display: state.showPreview ? "block" : "none",
              }}
            ></canvas>

            <canvas
              ref="canvasSave"
              id="canvas_save"
              hidden
              style={{
                width: "1280px",
                height: "720px",
                border: "2px solid black",
              }}
            ></canvas>

            <br />
            {state.advancedMode && <AdvancedPanel />}
          </div>
        )}
      </div>
    );
  },
};
