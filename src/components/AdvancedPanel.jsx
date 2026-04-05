import { computed, ref } from "vue";
import { state } from "../state";
import { UpdateFeedbackUI, highlightShader } from "../ui/ui";
import { buildCompositeShader } from "../shader/CompositeShader";
import { RenderingPipeline } from "./Advanced/RenderingPipeline";
import { GeneralSettings } from "./Advanced/GeneralSettings";
import { SavedShaders } from "./Advanced/SavedShaders";
import { FeedbackSettings } from "./Advanced/FeedbackSettings";

export default {
  setup() {
    const sourceCodeHighlighted = computed(() => {
      if (!state.favoriteShader) return "";
      return highlightShader(state.favoriteShader.GetCode());
    });

    const feedbackCodeHighlighted = computed(() => {
      if (!state.favoriteShader) return "";
      const fs = state.favoriteShader;
      const w = state.canvas_main?.width || 1280;
      const h = state.canvas_main?.height || 720;
      const code = buildCompositeShader(
        fs.feedbackBlendMode ?? 0,
        fs.feedbackMaskType ?? 0,
        fs.feedbackModType ?? 0,
        fs.feedbackOpOrder ?? 0,
        fs.feedbackSharpen ?? 0,
        fs.feedbackBlur ?? 0,
        w,
        h,
      );
      return highlightShader(code);
    });

    const chromaKeyHex = computed({
      get: () => {
        if (!state.favoriteShader?.chromaKeyColor) return "#00ff00";
        const { x, y, z } = state.favoriteShader.chromaKeyColor;
        const r = Math.round(x * 255)
          .toString(16)
          .padStart(2, "0");
        const g = Math.round(y * 255)
          .toString(16)
          .padStart(2, "0");
        const b = Math.round(z * 255)
          .toString(16)
          .padStart(2, "0");
        return `#${r}${g}${b}`;
      },
      set: (val) => {
        const r = parseInt(val.slice(1, 3), 16) / 255;
        const g = parseInt(val.slice(3, 5), 16) / 255;
        const b = parseInt(val.slice(5, 7), 16) / 255;
        state.favoriteShader.chromaKeyColor.set(r, g, b);
        UpdateFeedbackUI();
      },
    });

    return {
      state,
      sourceCodeHighlighted,
      feedbackCodeHighlighted,
      chromaKeyHex,
    };
  },
  render() {
    if (!state.favoriteShader) return null;

    return (
      <div id="div_advanced">
        <hr />
        <div class="advanced-container">
          <div class="advanced-column pipeline-column">
            <RenderingPipeline
              sourceCode={this.sourceCodeHighlighted}
              feedbackCode={this.feedbackCodeHighlighted}
            />
          </div>

          <div class="advanced-column controls-column">
            <FeedbackSettings v-model:chromaKeyHex={this.chromaKeyHex} />
            <GeneralSettings>
              <SavedShaders />
            </GeneralSettings>
          </div>
        </div>
      </div>
    );
  },
};
