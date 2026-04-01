import { state } from './state';
import { buildCompositeShader } from './shader/ShaderLibrary';

const programCache = {};

export function InitWebgl() 
{
    let x = state.canvasContext_shader;

    // create simple pass-through vertex shader (shared by all programs)
    state.vertexShader = x.createShader(x.VERTEX_SHADER);
    x.shaderSource(state.vertexShader, "attribute vec4 p;void main(){gl_Position=p;}");
    x.compileShader(state.vertexShader);
    let compiled = x.getShaderParameter(state.vertexShader, x.COMPILE_STATUS);
    if (!compiled)
    {
        let shaderLog = x.getShaderInfoLog(state.vertexShader);
        state.textarea_debug.value = "VERTEX SHADER ERROR!\n" + shaderLog;
        state.vertexShader = 0;
        return;
    }
    
    // giant-triangle vertex buffer covering the viewport
    let vb = x.ARRAY_BUFFER;
    x.bindBuffer(vb, x.createBuffer());
    x.bufferData(vb, new Int8Array([-3, 1, 1, -3, 1, 1]), x.STATIC_DRAW);
    x.enableVertexAttribArray(0);
    x.vertexAttribPointer(0, 2, x.BYTE, 0, 0, 0);
}

// ── Framebuffer helpers ────────────────────────────────────────────────────

function _makeColorTex(x, w, h)
{
    let tex = x.createTexture();
    x.bindTexture(x.TEXTURE_2D, tex);
    x.texImage2D(x.TEXTURE_2D, 0, x.RGBA, w, h, 0, x.RGBA, x.UNSIGNED_BYTE, null);
    x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MIN_FILTER, x.LINEAR);
    x.texParameteri(x.TEXTURE_2D, x.TEXTURE_MAG_FILTER, x.LINEAR);
    x.texParameteri(x.TEXTURE_2D, x.TEXTURE_WRAP_S, x.CLAMP_TO_EDGE);
    x.texParameteri(x.TEXTURE_2D, x.TEXTURE_WRAP_T, x.CLAMP_TO_EDGE);
    x.bindTexture(x.TEXTURE_2D, null);
    return tex;
}

function _makeFBO(x, tex)
{
    let fbo = x.createFramebuffer();
    x.bindFramebuffer(x.FRAMEBUFFER, fbo);
    x.framebufferTexture2D(x.FRAMEBUFFER, x.COLOR_ATTACHMENT0, x.TEXTURE_2D, tex, 0);
    x.bindFramebuffer(x.FRAMEBUFFER, null);
    return fbo;
}

/**
 * (Re)create the two ping-pong framebuffers to match the current canvas size.
 * Safe to call multiple times – old textures/FBOs are deleted first.
 */
export function InitFeedbackBuffers()
{
    let x = state.canvasContext_shader;
    let w = state.canvas_shader.width;
    let h = state.canvas_shader.height;

    // destroy old resources
    for (let i = 0; i < 3; i++)
    {
        if (state.feedbackTextures[i])    x.deleteTexture(state.feedbackTextures[i]);
        if (state.feedbackFramebuffers[i]) x.deleteFramebuffer(state.feedbackFramebuffers[i]);
    }

    // create new resources
    for (let i = 0; i < 3; i++)
    {
        state.feedbackTextures[i]    = _makeColorTex(x, w, h);
        state.feedbackFramebuffers[i] = _makeFBO(x, state.feedbackTextures[i]);
    }

    state.feedbackCanvasWidth  = w;
    state.feedbackCanvasHeight = h;
    state.feedbackCompositeProgram = null; // invalidate cached composite program
}

/**
 * Clear both ping-pong buffers to transparent black.
 * Call this when the active shader changes and feedbackClearOnChange is true.
 */
export function ClearFeedback()
{
    let x = state.canvasContext_shader;
    if (!state.feedbackFramebuffers[0]) return;

    for (let i = 0; i < 3; i++)
    {
        x.bindFramebuffer(x.FRAMEBUFFER, state.feedbackFramebuffers[i]);
        x.clearColor(0, 0, 0, 0);
        x.clear(x.COLOR_BUFFER_BIT);
    }
    x.bindFramebuffer(x.FRAMEBUFFER, null);
}

// ── Shader program helpers ─────────────────────────────────────────────────

function _compileFragment(x, src)
{
    let sh = x.createShader(x.FRAGMENT_SHADER);
    x.shaderSource(sh, src);
    x.compileShader(sh);
    if (!x.getShaderParameter(sh, x.COMPILE_STATUS))
    {
        state.textarea_debug.value = "FRAGMENT SHADER ERROR!\n" + x.getShaderInfoLog(sh);
        return null;
    }
    return sh;
}

function _linkProgram(x, fragShader)
{
    let prog = x.createProgram();
    x.attachShader(prog, state.vertexShader);
    x.attachShader(prog, fragShader);
    x.linkProgram(prog);
    if (!x.getProgramParameter(prog, x.LINK_STATUS))
    {
        state.textarea_debug.value = "LINK ERROR!\n" + x.getProgramInfoLog(prog);
        return null;
    }
    return prog;
}

function _getOrCreateProgram(x, src)
{
    if (programCache[src]) return programCache[src];

    let frag = _compileFragment(x, src);
    if (!frag) return null;

    let prog = _linkProgram(x, frag);
    if (!prog) return null;

    programCache[src] = prog;
    return prog;
}

// ── Main render entry point ────────────────────────────────────────────────

/**
 * Render one frame.
 *
 * @param {string}  code            - GLSL fragment body (mainImage)
 * @param {object}  [feedbackOpts]  - if present, enables the two-pass path:
 *   {
 *     useFeedback:      boolean,
 *     feedbackBlendMode: number 0–7,
 *     feedbackAmount:    number 0–1,
 *     feedbackMaskType:  number 0–4,
 *   }
 */
export function RenderShader(code, feedbackOpts)
{
    if (!state.vertexShader) return;

    let x = state.canvasContext_shader;
    let w = state.canvas_shader.width;
    let h = state.canvas_shader.height;

    // ── Build and cache the mainImage program ────────────────────────────────
    let mainSrc =
        "precision mediump float;" +
        `const vec3 iResolution = vec3(${w},${h},0.);` +
        `uniform float iTime;` +
        code +
        `\nvoid main(){mainImage(gl_FragColor,gl_FragCoord.xy);}`;

    let mainProg = _getOrCreateProgram(x, mainSrc);
    if (!mainProg) return;

    state.time = performance.now() / 1000;

    const feedback = feedbackOpts && feedbackOpts.useFeedback;

    if (feedback)
    {
        // ── Resize ping-pong buffers if canvas changed ───────────────────────
        if (w !== state.feedbackCanvasWidth || h !== state.feedbackCanvasHeight)
        {
            InitFeedbackBuffers();
            state.feedbackIndex = 1; // Default to first history slot
        }

        /**
         * 3-Buffer Accumulation Logic
         * Buffer 0: "Raw" current frame output
         * Buffer 1: History A
         * Buffer 2: History B
         * 
         * 1. Render mainImage -> Buffer 0
         * 2. prevIdx = state.feedbackIndex (1 or 2)
         * 3. nextIdx = 1 if prevIdx == 2 else 2
         * 4. Composite (Buffer 0 + Buffer[prevIdx]) -> Buffer[nextIdx]
         * 5. Blit Buffer[nextIdx] to Screen
         * 6. feedbackIndex = nextIdx
         */
        const rawIdx  = 0;
        const prevIdx = state.feedbackIndex === 1 || state.feedbackIndex === 2 ? state.feedbackIndex : 1;
        const nextIdx = prevIdx === 1 ? 2 : 1;

        // ── Pass 1: render mainImage → raw FBO (0) ───────────────────────────
        x.bindFramebuffer(x.FRAMEBUFFER, state.feedbackFramebuffers[rawIdx]);
        x.viewport(0, 0, w, h);
        x.useProgram(mainProg);
        x.uniform1f(x.getUniformLocation(mainProg, 'iTime'), state.time);
        x.drawArrays(x.TRIANGLE_FAN, 0, 3);

        // ── Build / cache composite program ──────────────────────────────────
        let compSrc = buildCompositeShader(
            feedbackOpts.feedbackBlendMode,
            feedbackOpts.feedbackMaskType,
            feedbackOpts.feedbackModType    ?? 0,
            feedbackOpts.feedbackOpOrder    ?? 0,
            feedbackOpts.feedbackSharpen    ?? 0,
            feedbackOpts.feedbackBlur       ?? 0,
            w, h
        );
        let compProg = _getOrCreateProgram(x, compSrc);

        // ── Pass 2: composite → next history FBO ─────────────────────────────
        x.bindFramebuffer(x.FRAMEBUFFER, state.feedbackFramebuffers[nextIdx]);
        x.viewport(0, 0, w, h);
        x.useProgram(compProg);

        // bind textures — optionally swap curr/prev roles
        const swap    = feedbackOpts.feedbackSwap;
        const texA    = swap ? state.feedbackTextures[prevIdx] : state.feedbackTextures[rawIdx];
        const texB    = swap ? state.feedbackTextures[rawIdx]  : state.feedbackTextures[prevIdx];

        // iCurrent
        x.activeTexture(x.TEXTURE0);
        x.bindTexture(x.TEXTURE_2D, texA);
        x.uniform1i(x.getUniformLocation(compProg, 'iCurrent'), 0);

        // iPrevious (last frame's accumulated result)
        x.activeTexture(x.TEXTURE1);
        x.bindTexture(x.TEXTURE_2D, texB);
        x.uniform1i(x.getUniformLocation(compProg, 'iPrevious'), 1);

        x.uniform1f(x.getUniformLocation(compProg, 'iFeedbackAmount'),    feedbackOpts.feedbackAmount);
        x.uniform1f(x.getUniformLocation(compProg, 'iFeedbackModAmount'), feedbackOpts.feedbackModAmount ?? 0);
        x.uniform1f(x.getUniformLocation(compProg, 'iTime'),              state.time);

        // Chroma Key uniforms
        const key = feedbackOpts.chromaKeyColor || {x:0, y:1, z:0};
        x.uniform3f(x.getUniformLocation(compProg, 'iChromaKeyColor'), key.x, key.y, key.z);
        x.uniform1f(x.getUniformLocation(compProg, 'iChromaThreshold'), feedbackOpts.chromaThreshold ?? 0.1);
        x.uniform1f(x.getUniformLocation(compProg, 'iChromaSoftness'),  feedbackOpts.chromaSoftness  ?? 0.1);
        x.uniform1i(x.getUniformLocation(compProg, 'iChromaMode'),      feedbackOpts.chromaMode      ?? 0);

        x.drawArrays(x.TRIANGLE_FAN, 0, 3);

        // ── Pass 3: blit comp result to canvas ───────────────────────────────
        x.bindFramebuffer(x.FRAMEBUFFER, null);
        x.viewport(0, 0, w, h);
        
        const blitFullSrc = `precision mediump float;uniform sampler2D iChannel0;const vec2 iResolution=vec2(${w},${h});void main(){gl_FragColor=texture2D(iChannel0,gl_FragCoord.xy/iResolution);}`;
        let blitProg = _getOrCreateProgram(x, blitFullSrc);
        x.useProgram(blitProg);
        x.activeTexture(x.TEXTURE0);
        x.bindTexture(x.TEXTURE_2D, state.feedbackTextures[nextIdx]);
        x.uniform1i(x.getUniformLocation(blitProg, 'iChannel0'), 0);
        x.drawArrays(x.TRIANGLE_FAN, 0, 3);

        // ── Commit: the frame we just rendered into nextIdx is now "history" ──
        state.feedbackIndex = nextIdx;
    }
    else
    {
        // ── Single-pass (no feedback): render directly to canvas ─────────────
        x.bindFramebuffer(x.FRAMEBUFFER, null);
        x.viewport(0, 0, w, h);
        x.useProgram(mainProg);
        x.uniform1f(x.getUniformLocation(mainProg, 'iTime'), state.time);
        x.drawArrays(x.TRIANGLE_FAN, 0, 3);
    }
}
