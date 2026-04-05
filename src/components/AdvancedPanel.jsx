import { computed } from 'vue';
import { state } from '../state';
import { 
    UpdateFeedbackUI, SetGridSize, 
    OpenCapJS, 
    highlightShader
} from '../ui/ui';
import { SelectSavedShader, ExportSaveList, DeleteSelectedSave } from '../storage';
import { buildCompositeShader } from '../shader/ShaderLibrary';

export default {
    setup() {
        const sourceCodeHighlighted = computed(() => {
            if (!state.favoriteShader) return '';
            return highlightShader(state.favoriteShader.GetCode());
        });

        const feedbackCodeHighlighted = computed(() => {
            if (!state.favoriteShader) return '';
            const fs = state.favoriteShader;
            const w = state.canvas_main?.width || 1280;
            const h = state.canvas_main?.height || 720;
            const code = buildCompositeShader(
                fs.feedbackBlendMode  ?? 0,
                fs.feedbackMaskType   ?? 0,
                fs.feedbackModType    ?? 0,
                fs.feedbackOpOrder    ?? 0,
                fs.feedbackSharpen    ?? 0,
                fs.feedbackBlur       ?? 0,
                w, h
            );
            return highlightShader(code);
        });

        const chromaKeyHex = computed({
            get: () => {
                if (!state.favoriteShader?.chromaKeyColor) return '#00ff00';
                const { x, y, z } = state.favoriteShader.chromaKeyColor;
                const r = Math.round(x * 255).toString(16).padStart(2, '0');
                const g = Math.round(y * 255).toString(16).padStart(2, '0');
                const b = Math.round(z * 255).toString(16).padStart(2, '0');
                return `#${r}${g}${b}`;
            },
            set: (val) => {
                const r = parseInt(val.slice(1, 3), 16) / 255;
                const g = parseInt(val.slice(3, 5), 16) / 255;
                const b = parseInt(val.slice(5, 7), 16) / 255;
                state.favoriteShader.chromaKeyColor.set(r, g, b);
                UpdateFeedbackUI();
            }
        });

        return {
            state,
            sourceCodeHighlighted,
            feedbackCodeHighlighted,
            chromaKeyHex,
            UpdateFeedbackUI,
            SetGridSize,
            SelectSavedShader,
            OpenCapJS,
            ExportSaveList,
            DeleteSelectedSave
        };
    },
    render() {
        const { state } = this;
        if (!state.favoriteShader) return null;
        const fsActive = state.favoriteShader;

        return (
            <div id="div_advanced">
                <hr />
                <div class="advanced-container">
                    {/* Pipeline Column (Left) */}
                    <div class="advanced-column pipeline-column">
                        <details class="advanced-group">
                            <summary>𝓡𝓮𝓷𝓭𝓮𝓻𝓲𝓷𝓰 𝓟𝓲𝓹𝓮𝓵𝓲𝓷𝓮</summary>
                            <div id="pipeline_container" class="pipeline-container">
                                <div class="pipeline-flow">
                                    <div class="pipeline-node generator-node">
                                        <div class="node-header">
                                            <span>⚡ GENERATOR (PASS 1)</span>
                                            <div class="node-params">
                                                <span class="node-param-tag active" title="Renders procedural content">Procedural</span>
                                            </div>
                                        </div>
                                        <div class="code-viewer" v-html={this.sourceCodeHighlighted}></div>
                                        <button class="copy-btn" onClick={() => navigator.clipboard.writeText(fsActive.GetCode())}>Copy Source Code</button>
                                    </div>

                                    <div class="pipeline-connection pulse"></div>

                                    <div class="buffer-nodes">
                                        <div class="buffer-tag active"><b>RAW</b> (Buffer 0)</div>
                                    </div>

                                    <div class="pipeline-connection pulse"></div>

                                    <div id="feedback_loop_container" class="feedback-loop-container" style={{ opacity: fsActive.useFeedback ? 1 : 0.3 }}>
                                        <svg class="feedback-svg" viewBox="0 0 100 100" style={{ opacity: fsActive.useFeedback ? 1 : 0 }}>
                                            <path id="feedback_loop_path" class="feedback-path" d="M 80,50 C 110,50 110,-50 80,-50" transform="translate(-10, 50) rotate(-90, 50, 50)"></path>
                                        </svg>
                                        
                                        <div class="pipeline-node compositor-node">
                                            <div class="node-header">
                                                <span>🌀 COMPOSITOR (PASS 2)</span>
                                                <div class="node-params">
                                                    <span class="node-param-tag active">Blend: {fsActive.feedbackBlendMode}</span>
                                                    <span class="node-param-tag active">Mask: {fsActive.feedbackMaskType}</span>
                                                </div>
                                            </div>
                                            <div class="code-viewer" v-html={this.feedbackCodeHighlighted}></div>
                                            <button class="copy-btn" onClick={() => navigator.clipboard.writeText(this.feedbackCodeHighlighted)}>Copy Feedback Code</button>
                                        </div>
                                    </div>

                                    <div class="pipeline-connection pulse"></div>

                                    <div class="buffer-nodes" style={{ opacity: fsActive.useFeedback ? 1 : 0.2 }}>
                                        <div class="buffer-tag history"><b>HIST A</b> (Buff 1)</div>
                                        <div class="buffer-tag history"><b>HIST B</b> (Buff 2)</div>
                                    </div>

                                    <div class="pipeline-connection pulse" style={{ opacity: fsActive.useFeedback ? 1 : 0.2 }}></div>

                                    <div class="pipeline-node output-node">
                                        <div class="node-header">
                                            <span>📺 OUTPUT (PASS 3)</span>
                                            <div class="node-params">
                                                <span class="node-param-tag active">Screen Blit</span>
                                            </div>
                                        </div>
                                        <div class="code-viewer" style={{ maxHeight: '40px', color: '#5AF' }}>
                                            Final image blitted to viewport after accumulation path...
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <h3 style={{ marginTop: '20px' }}>📜 Raw GLSL Output</h3>
                            <textarea disabled value={state.ui.textareaCode} rows={4}></textarea>
                            <textarea disabled hidden={!state.ui.textareaDebug} value={state.ui.textareaDebug} style={{ color: '#F00' }} rows={4}></textarea>
                            <h3 style={{ marginTop: '10px' }}>🔗 Persistence (Base 64 JSON)</h3>
                            <textarea disabled value={state.ui.textareaJson} rows={4}></textarea>
                        </details>
                    </div>

                    {/* Controls Column (Right) */}
                    <div class="advanced-column controls-column">
                        <details class="advanced-group" open>
                            <summary>⚙️ Settings & 💾 Saves</summary>
                            <div class="control-row">
                                <label><input type="checkbox" v-model={state.settings.showWatermark} /> Watermark</label>
                                <label><input type="checkbox" v-model={state.feedback.clearOnChange} /> Clear on Change</label>
                            </div>
                            <div class="control-row">
                                <span>Save Scale:</span>
                                <input type="number" v-model={state.settings.saveScale} class="advanced" />
                            </div>
                            <div class="control-row">
                                <span>Grid Size:</span>
                                <input 
                                    type="number" 
                                    value={state.gridSize} 
                                    onInput={(e) => this.SetGridSize(parseInt(e.target.value))} 
                                    class="advanced" 
                                />
                            </div>
                            <div class="control-row">
                                <span>Start Iters:</span>
                                <input type="number" v-model={state.startIterations} class="advanced" />
                            </div>
                            <div class="control-row">
                                <span>Rand Len:</span>
                                <input type="number" v-model={state.settings.randomizeLength} class="advanced" />
                            </div>
                            
                            <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '10px', fontWeight: 'bold', color: '#5AF' }}>💾 Saved Shaders</div>
                            <select 
                                id="select_saveList" 
                                onChange={(e) => this.SelectSavedShader(e.target.selectedIndex)} 
                                size={6} 
                                style={{ width: '100%', marginBottom: '10px' }}
                            >
                                {state.saveList.map((s, i) => (
                                    <option key={i} value={i}>{s.GetGenerationString()}</option>
                                ))}
                            </select>
                            
                            <div class="buttons-group">
                                <button class="action-button" onClick={this.OpenCapJS}>CapJS</button>
                                <button class="action-button" onClick={this.ExportSaveList}>Export</button>
                                <button class="action-button" onClick={() => document.getElementById('input_importFile').click()}>Import</button>
                                <input id="input_importFile" type="file" style={{ display: 'none' }} />
                                <button class="action-button danger" onClick={this.DeleteSelectedSave}>Delete</button>
                            </div>
                        </details>

                        <details class="advanced-group">
                            <summary>🌀 Feedback</summary>
                            <div class="control-row">
                                <label><input type="checkbox" v-model={fsActive.useFeedback} onChange={this.UpdateFeedbackUI} /> <b>Enable</b></label>
                                <label><input type="checkbox" v-model={state.feedback.locked} /> Lock</label>
                                <label><input type="checkbox" v-model={fsActive.feedbackSwap} onChange={this.UpdateFeedbackUI} /> Swap</label>
                            </div>
                            
                            <div class="control-row">
                                <span>Blend:</span>
                                <select v-model={fsActive.feedbackBlendMode} onChange={this.UpdateFeedbackUI}>
                                    <option value={0}>0 - Mix</option>
                                    <option value={1}>1 - Additive</option>
                                    <option value={2}>2 - Multiply</option>
                                    <option value={3}>3 - Screen</option>
                                    <option value={4}>4 - Difference</option>
                                    <option value={5}>5 - Lighten</option>
                                    <option value={6}>6 - Darken</option>
                                    <option value={7}>7 - Burn</option>
                                    <option value={8}>8 - Atop</option>
                                </select>
                            </div>

                            <div class="control-row slider-row">
                                <span>Mix: <span>{(fsActive.feedbackAmount ?? 0).toFixed(2)}</span></span>
                                <input type="range" min="0.5" max="0.99" step="0.01" v-model={fsActive.feedbackAmount} onInput={this.UpdateFeedbackUI} />
                            </div>

                            <div class="control-row">
                                <span>Mask:</span>
                                <select v-model={fsActive.feedbackMaskType} onChange={this.UpdateFeedbackUI}>
                                    <option value={0}>0 - None</option>
                                    <option value={1}>1 - Luminance</option>
                                    <option value={2}>2 - Red Channel</option>
                                    <option value={3}>3 - Edge Detect</option>
                                    <option value={4}>4 - Hue Distance</option>
                                    <option value={5}>5 - Alpha Channel</option>
                                    <option value={6}>6 - Chroma Key</option>
                                </select>
                            </div>

                            {fsActive.feedbackMaskType === 6 && (
                                <div class="chroma-settings">
                                    <div class="control-row">
                                        <span>Key:</span>
                                        <select v-model={fsActive.chromaMode} onChange={this.UpdateFeedbackUI}>
                                            <option value={0}>RGB</option>
                                            <option value={1}>Hue</option>
                                            <option value={2}>Sat</option>
                                            <option value={3}>Val</option>
                                        </select>
                                        <input type="color" v-model={this.chromaKeyHex} />
                                    </div>
                                    <div class="control-row slider-row">
                                        <span>Thr: <span>{(fsActive.chromaThreshold ?? 0).toFixed(2)}</span></span>
                                        <input type="range" min="0" max="1" step="0.01" v-model={fsActive.chromaThreshold} onInput={this.UpdateFeedbackUI} />
                                    </div>
                                    <div class="control-row slider-row">
                                        <span>Soft: <span>{(fsActive.chromaSoftness ?? 0).toFixed(2)}</span></span>
                                        <input type="range" min="0" max="1" step="0.01" v-model={fsActive.chromaSoftness} onInput={this.UpdateFeedbackUI} />
                                    </div>
                                </div>
                            )}

                            <div class="control-row slider-row">
                                <span>Sharp: <span>{(fsActive.feedbackSharpen ?? 0).toFixed(2)}</span></span>
                                <input type="range" min="0" max="1" step="0.01" v-model={fsActive.feedbackSharpen} onInput={this.UpdateFeedbackUI} />
                            </div>

                            <div class="control-row slider-row">
                                <span>Blur: <span>{(fsActive.feedbackBlur ?? 0).toFixed(2)}</span></span>
                                <input type="range" min="0" max="1" step="0.01" v-model={fsActive.feedbackBlur} onInput={this.UpdateFeedbackUI} />
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        );
    }
};
