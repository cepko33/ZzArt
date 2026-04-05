import { CodeViewer } from '../CodeViewer';
import { state } from '../../state';

export const PipelineNode = {
    props: ['title', 'tags', 'code', 'copyCode', 'color'],
    render() {
        const nodeClass = `pipeline-node ${this.title.toLowerCase().split(' ')[1]}-node`;
        return (
            <div class={nodeClass}>
                <div class="node-header">
                    <span>{this.title}</span>
                    <div class="node-params">
                        {this.tags?.map(tag => (
                            <span class="node-param-tag active" title={tag.title}>{tag.label}</span>
                        ))}
                    </div>
                </div>
                {this.code && <CodeViewer code={this.code} color={this.color} />}
                {this.copyCode && <button class="copy-btn" onClick={() => navigator.clipboard.writeText(this.copyCode)}>Copy Code</button>}
                {this.$slots.default?.()}
            </div>
        );
    }
};

export const RenderingPipeline = {
    props: ['sourceCode', 'feedbackCode'],
    render() {
        if (!state.favoriteShader) return null;
        const fsActive = state.favoriteShader;

        return (
            <details class="advanced-group">
                <summary>𝓡𝓮𝓷𝓭𝓮𝓻𝓲𝓷𝓰 𝓟𝓲𝓹𝓮𝓵𝓲𝓷𝓮</summary>
                <div id="pipeline_container" class="pipeline-container">
                    <div class="pipeline-flow">
                        <PipelineNode 
                            title="⚡ GENERATOR (PASS 1)" 
                            tags={[{ label: 'Procedural', title: 'Renders procedural content' }]} 
                            code={this.sourceCode} 
                            copyCode={fsActive.GetCode()}
                        />

                        <div class="pipeline-connection pulse"></div>

                        <div class="buffer-nodes">
                            <div class="buffer-tag active"><b>RAW</b> (Buffer 0)</div>
                        </div>

                        <div class="pipeline-connection pulse"></div>

                        <div id="feedback_loop_container" class="feedback-loop-container" style={{ opacity: fsActive.useFeedback ? 1 : 0.3 }}>
                            <svg class="feedback-svg" viewBox="0 0 100 100" style={{ opacity: fsActive.useFeedback ? 1 : 0 }}>
                                <path id="feedback_loop_path" class="feedback-path" d="M 80,50 C 110,50 110,-50 80,-50" transform="translate(-10, 50) rotate(-90, 50, 50)"></path>
                            </svg>
                            
                            <PipelineNode 
                                title="🌀 COMPOSITOR (PASS 2)" 
                                tags={[
                                    { label: `Blend: ${fsActive.feedbackBlendMode}`, title: 'Blend Mode' },
                                    { label: `Mask: ${fsActive.feedbackMaskType}`, title: 'Mask Type' }
                                ]} 
                                code={this.feedbackCode} 
                                copyCode={this.feedbackCode}
                            />
                        </div>

                        <div class="pipeline-connection pulse"></div>

                        <div class="buffer-nodes" style={{ opacity: fsActive.useFeedback ? 1 : 0.2 }}>
                            <div class="buffer-tag history"><b>HIST A</b> (Buff 1)</div>
                            <div class="buffer-tag history"><b>HIST B</b> (Buff 2)</div>
                        </div>

                        <div class="pipeline-connection pulse" style={{ opacity: fsActive.useFeedback ? 1 : 0.2 }}></div>

                        <PipelineNode title="📺 OUTPUT (PASS 3)" tags={[{ label: 'Screen Blit', title: 'Screen Blit' }]} color="#5AF">
                            <div class="code-viewer" style={{ maxHeight: '40px', color: '#5AF' }}>
                                Final image blitted to viewport after accumulation path...
                            </div>
                        </PipelineNode>
                    </div>
                </div>
                
                <h3 style={{ marginTop: '20px' }}>📜 Raw GLSL Output</h3>
                <textarea disabled value={state.ui.textareaCode} rows={4}></textarea>
                <textarea disabled hidden={!state.ui.textareaDebug} value={state.ui.textareaDebug} style={{ color: '#F00' }} rows={4}></textarea>
                <h3 style={{ marginTop: '10px' }}>🔗 Persistence (Base 64 JSON)</h3>
                <textarea disabled value={state.ui.textareaJson} rows={4}></textarea>
            </details>
        );
    }
};
