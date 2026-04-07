import { state } from '../state';
import { Rand, RandInt, RandBetween, RandSeeded, Clamp, Vector3 } from '../utils/math';
import { ShaderStatement } from './ShaderStatement';
import { ShaderBuilder } from './ShaderBuilder';
import { buildPreamble, collectUsedLibNames } from './ShaderLibrary';
import { RenderShader, ClearFeedback } from '../webgl';

export class ShaderObject {
    constructor() {
        this.shaderStatements = [];
        this.randSeed = state.randSeed;
        this.randSeedString = state.randSeedString.length
            ? state.randSeedString
            : '' + state.randSeed;
        this.iterationCount = 1;
        this.gridPosX = -1;
        this.gridPosY = -1;
        this.generation = 0;
        this.subGeneration = 0;
        this.hueOffset = 0;
        this.hueScale = 1;
        this.saturationScale = 1;
        this.uvOffsetX = 0;
        this.uvOffsetY = 0;
        this.uvScaleX = 1;
        this.uvScaleY = 1;
        this.rotate = 0;
        this.usePalette = 0;
        this.useTimeInLibrary = 0;
        this.paletteColors = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
        this.saveListIndex = -1;
        this.uniqueID = ++state.uniqueID;

        // Feedback / compositing
        this.useFeedback = 0;
        this.feedbackBlendMode = 0; // 0-8, see CompositeShader.buildCompositeShader
        this.feedbackAmount = 0.92; // 0-1, weight toward previous frame
        this.feedbackMaskType = 0; // 0-4, mask type for spatially-varying blend
        this.feedbackModType = 0; // 0-4, UV modulation applied to previous-frame sample
        this.feedbackModAmount = 0.3; // 0-1, modulation strength
        this.feedbackOpOrder = 0; // 0-5, how mask and modulation are cross-wired
        this.feedbackSwap = 0; // 0/1, swap curr/prev texture roles before compositing
        this.feedbackSharpen = 0; // 0-1, sharpen amount for final feedback pass
        this.feedbackBlur = 0; // 0-1, blur amount for final feedback pass

        // Chroma Key settings
        this.chromaMode = 0; // 0 RGB, 1 Hue, 2 Sat, 3 Lum
        this.chromaKeyColor = new Vector3(0, 1, 0); // Default to green
        this.chromaThreshold = 0.1;
        this.chromaSoftness = 0.1;

        // Post-processing stacks
        this.preFilters = [];
        this.postFilters = [];
    }

    SetGridPos(X, Y) {
        this.gridPosX = X;
        this.gridPosY = Y;
    }
    IsVariation() {
        return this.gridPosX >= 0;
    }
    IsSaveList() {
        return this.saveListIndex >= 0;
    }

    MakeAllObjectFloatsFixed(object, digits = 3) {
        // keep floats small
        for (let key in object) {
            let subObject = object[key];
            if (typeof subObject === 'object') this.MakeAllObjectFloatsFixed(subObject);
            else if (typeof subObject === 'number')
                object[key] = parseFloat(subObject.toFixed(digits));
        }
    }

    Randomize(keepFeedback = false) {
        let statementCount = state.settings.randomizeLength;
        if (statementCount < 0) statementCount = 0;

        this.usePalette = 1;
        this.useTimeInLibrary = Rand() < 0.9 ? 1 : 0;
        this.hueOffset = Rand();
        this.hueScale = RandBetween(-1, 1);
        this.saturationScale = Rand();
        this.generation = 0;
        this.subGeneration = 0;
        this.shaderStatements = [];
        this.uvOffsetX = RandBetween(-0.01, 0.01);
        this.uvOffsetY = RandBetween(-0.01, 0.01);
        this.uvScaleX = RandBetween(-1, 1);
        this.uvScaleY = RandBetween(-1, 1);
        this.iterationCount = state.startIterations;
        for (let i = statementCount; i--; ) {
            let statement = new ShaderStatement();
            statement.Randomize();
            this.shaderStatements.push(statement);
        }

        for (let color of this.paletteColors) color.Randomize(0, 1);

        // Feedback: off by default, 20 % chance to enable
        if (!keepFeedback) {
            this.useFeedback = Rand() < 0.2 ? 1 : 0;
            if (this.useFeedback) {
                this.feedbackBlendMode = RandInt(9);
                this.feedbackAmount = RandBetween(0.8, 0.97);
                this.feedbackMaskType = RandInt(5);
                this.feedbackModType = RandInt(5);
                this.feedbackModAmount = RandBetween(0.1, 0.6);
                this.feedbackOpOrder = RandInt(6);
                this.feedbackSwap = Rand() < 0.3 ? 1 : 0;
                this.feedbackSharpen = Rand() < 0.15 ? RandBetween(0.1, 0.4) : 0;
                this.feedbackBlur = Rand() < 0.15 ? RandBetween(0.1, 0.4) : 0;
                this.chromaMode = RandInt(4);
                this.chromaKeyColor.Randomize(0, 1);
                this.chromaThreshold = RandBetween(0.01, 0.2);
                this.chromaSoftness = RandBetween(0.01, 0.2);
            }
        }

        this.preFilters = [];
        this.postFilters = [];
        this._randomizeFilters(this.preFilters);
        this._randomizeFilters(this.postFilters);

        this.MakeAllObjectFloatsFixed(this);
    }

    _randomizeFilters(stack) {
        if (Rand() < 0.15) {
            const count = RandInt(3);
            for (let i = 0; i < count; i++) {
                const f =
                    state.postProcessFunctions[RandInt(state.postProcessFunctions.length)];
                stack.push({
                    name: f.name,
                    params: this._generateDefaultParams(f.name),
                    enabled: true,
                });
            }
        }
    }

    _generateDefaultParams(name) {
        if (name === 'FilterRGBShift') return { offset: { x: RandBetween(-0.05, 0.05), y: RandBetween(-0.05, 0.05) } };
        if (name === 'FilterColorBalance') return { rgb: { x: RandBetween(0.8, 1.2), y: RandBetween(0.8, 1.2), z: RandBetween(0.8, 1.2) } };
        if (name === 'FilterDuotone') return {
            col1: { x: RandBetween(0, 0.5), y: RandBetween(0, 0.5), z: RandBetween(0, 0.5) },
            col2: { x: RandBetween(0.5, 1.0), y: RandBetween(0.5, 1.0), z: RandBetween(0.5, 1.0) }
        };
        if (name === 'FilterVignette') return { radius: RandBetween(0.5, 0.9), softness: RandBetween(0.1, 0.5) };
        if (name === 'FilterPosterize') return { levels: RandBetween(2, 10) };
        if (name === 'FilterBrightness') return { amount: RandBetween(-0.2, 0.2) };
        if (name === 'FilterContrast') return { amount: RandBetween(0.8, 1.5) };
        if (name === 'FilterSaturation') return { amount: RandBetween(0.0, 2.0) };
        if (name === 'FilterHueShift') return { shift: Rand() };
        if (name === 'FilterBlur') return { radius: RandBetween(1, 5) };
        if (name === 'FilterSharpen') return { strength: RandBetween(0.1, 1.0) };
        if (name === 'FilterPixelate') return { size: RandBetween(2, 16) };
        if (name === 'FilterChromaticAberration') return { strength: RandBetween(0.1, 2.0) };
        if (name === 'FilterBloom') return { threshold: RandBetween(0.5, 0.9), strength: RandBetween(0.2, 1.0) };
        if (name === 'FilterFilmGrain') return { intensity: RandBetween(0.05, 0.2) };
        if (name === 'FilterEdgeDetection') return { strength: RandBetween(1.0, 5.0) };
        if (name === 'FilterGlitch') return { intensity: RandBetween(0.05, 0.3) };
        if (name === 'FilterCRT') return { bend: RandBetween(0.05, 0.2), scanline: RandBetween(0.1, 0.3) };
        if (name === 'FilterScanlines') return { freq: RandBetween(100, 300), amount: RandBetween(0.1, 0.3) };
        if (name === 'FilterTiltShift') return { center: RandBetween(0.3, 0.7), width: RandBetween(0.1, 0.3), strength: RandBetween(0.3, 0.8) };
        if (name === 'FilterKaleidoscope') return { segments: RandInt(3, 8) };
        if (name === 'FilterMirror') return { axis: Rand() > 0.5 ? 1.0 : 0.0 };
        if (name === 'FilterNightVision') return { intensity: RandBetween(0.5, 1.0) };
        if (name === 'FilterHalftone') return { size: RandBetween(5, 15) };
        if (name === 'FilterBleachBypass') return { amount: RandBetween(0.3, 0.8) };
        if (name === 'FilterDither') return { amount: RandBetween(0.02, 0.1) };
        if (name === 'FilterRadialBlur') return { strength: RandBetween(0.2, 1.0) };
        if (name === 'FilterSepia') return { amount: RandBetween(0.5, 1.0) };
        if (name === 'FilterInverse') return { amount: RandBetween(0.8, 1.0) };
        if (name === 'FilterGrayscale') return { amount: RandBetween(0.8, 1.0) };
        if (name === 'FilterThreshold') return { threshold: RandBetween(0.3, 0.7) };
        if (name === 'FilterSolarize') return { threshold: RandBetween(0.3, 0.7) };
        if (name === 'FilterExposure') return { exposure: RandBetween(-1.0, 1.0) };
        if (name === 'FilterGamma') return { gamma: RandBetween(0.5, 2.0) };

        if (name === 'FilterLomo' || name === 'FilterThermal' || name === 'FilterTechnicolor') return {};

        return { amount: RandBetween(0.1, 1.0) };
    }

    Clone() {
        let clone = Object.assign(new ShaderObject(), this);
        clone.shaderStatements = [];
        for (let statement of this.shaderStatements)
            clone.shaderStatements.push(Object.assign(new ShaderStatement(), statement));
        clone.paletteColors = [];
        for (let color of this.paletteColors)
            clone.paletteColors.push(Object.assign(new Vector3(), color));
        clone.chromaKeyColor = Object.assign(new Vector3(), this.chromaKeyColor);

        clone.preFilters = this.preFilters.map((f) => ({
            ...f,
            params: { ...f.params },
        }));
        clone.postFilters = this.postFilters.map((f) => ({
            ...f,
            params: { ...f.params },
        }));

        // fix old shaders that had too high iterations
        clone.iterationCount = Clamp(parseInt(clone.iterationCount), 1, state.maxIterations);
        return clone;
    }

    Mutate() {
        this.uniqueID = RandSeeded();
        this.subGeneration = 0;
        ++this.generation;

        if (this.shaderStatements.length <= 2) {
            this.Randomize();
            return;
        }

        if (Rand() < 0.3) {
            // remove statement
            let r = RandInt(this.shaderStatements.length);
            let s = this.shaderStatements[r];
            this.shaderStatements.splice(r, 1);
        }

        if (Rand() < 0.5) {
            // change order or a statement
            let r = RandInt(this.shaderStatements.length);
            let s = this.shaderStatements[r];
            this.shaderStatements.splice(r, 1);
            r = RandInt(this.shaderStatements.length + 1);
            this.shaderStatements.splice(r, 0, s);
        }

        for (let i = RandInt(4); i--; ) {
            // mutate statements
            let r = RandInt(this.shaderStatements.length);
            this.shaderStatements[r].Mutate();
        }

        if (Rand() < 0.9) {
            // insert random statement
            let statement = new ShaderStatement();
            statement.Randomize();
            let r = RandInt(this.shaderStatements.length + 1);
            this.shaderStatements.splice(r, 0, statement);
        }

        // mutate colors
        this.hueOffset += RandBetween(-0.1, 0.1);
        if (Rand() < 0.2) this.hueOffset = Rand();
        if (Rand() < 0.2) this.saturationScale = Rand();
        if (Rand() < 0.2) this.hueScale = RandBetween(-1, 1);
        if (Rand() < 0.4) {
            for (let color of this.paletteColors) color.Randomize(0, 1);
        }

        // mutate position
        if (Rand() < 0.01) {
            this.uvOffsetX = RandBetween(-0.01, 0.01);
            this.uvOffsetY = RandBetween(-0.01, 0.01);
            this.uvScaleX = RandBetween(-0.01, 0.01);
            this.uvScaleY = RandBetween(-0.01, 0.01);
        } else {
            this.uvOffsetX += RandBetween(-0.01, 0.01);
            this.uvOffsetY += RandBetween(-0.01, 0.01);
            this.uvScaleX += RandBetween(-0.01, 0.01);
            this.uvScaleY += RandBetween(-0.01, 0.01);
        }

        if (Rand() < 0.1) this.rotate = !this.rotate;

        if (Rand() < 0.1) this.iterationCount += RandInt(3) - 1;

        // occasionally flip the timed-library flag for extra variety
        if (Rand() < 0.15) this.useTimeInLibrary = this.useTimeInLibrary ? 0 : 1;

        // Feedback mutations
        if (!state.feedbackLocked) {
            if (Rand() < 0.01) this.useFeedback = this.useFeedback ? 0 : 1;
            if (this.useFeedback) {
                if (Rand() < 0.15) this.feedbackBlendMode = RandInt(9);
                if (Rand() < 0.1) this.feedbackMaskType = RandInt(5);
                if (Rand() < 0.1) this.feedbackModType = RandInt(5);
                if (Rand() < 0.1) this.feedbackOpOrder = RandInt(6);
                if (Rand() < 0.08) this.feedbackSwap = this.feedbackSwap ? 0 : 1;
                if (Rand() < 0.08)
                    this.feedbackSharpen = Clamp(
                        this.feedbackSharpen + RandBetween(-0.1, 0.1),
                        0,
                        1
                    );
                if (Rand() < 0.08)
                    this.feedbackBlur = Clamp(this.feedbackBlur + RandBetween(-0.1, 0.1), 0, 1);
                if (Rand() < 0.1) {
                    this.chromaMode = RandInt(4);
                    this.chromaKeyColor.Randomize(0, 1);
                }
                this.feedbackAmount = Clamp(
                    this.feedbackAmount + RandBetween(-0.05, 0.05),
                    0.5,
                    0.99
                );
                this.feedbackModAmount = Clamp(
                    this.feedbackModAmount + RandBetween(-0.08, 0.08),
                    0.0,
                    1.0
                );
                this.chromaThreshold = Clamp(
                    this.chromaThreshold + RandBetween(-0.03, 0.03),
                    0.0,
                    1.0
                );
                this.chromaSoftness = Clamp(
                    this.chromaSoftness + RandBetween(-0.03, 0.03),
                    0.0,
                    1.0
                );
            }
        }

        this._mutateFilters(this.preFilters);
        this._mutateFilters(this.postFilters);

        this.MakeAllObjectFloatsFixed(this);
    }

    _mutateFilters(stack) {
        if (Rand() < 0.1) {
            const f = state.postProcessFunctions[RandInt(state.postProcessFunctions.length)];
            stack.push({
                name: f.name,
                params: this._generateDefaultParams(f.name),
                enabled: true,
            });
        }
        if (stack.length > 0 && Rand() < 0.1) {
            stack.splice(RandInt(stack.length), 1);
        }
        for (const filter of stack) {
            if (Rand() < 0.1) filter.enabled = !filter.enabled;
            if (Rand() < 0.4) {
                for (const key in filter.params) {
                    const val = filter.params[key];
                    if (typeof val === 'number') {
                        filter.params[key] += RandBetween(-0.05, 0.05);
                    } else if (val && typeof val.x === 'number') {
                        val.x += RandBetween(-0.05, 0.05);
                        val.y += RandBetween(-0.05, 0.05);
                        if (typeof val.z === 'number') val.z += RandBetween(-0.05, 0.05);
                    }
                }
            }
        }
    }

    /**
     * Generates the final GLSL shader source code.
     * This uses the ShaderBuilder utility for structured, readable code output.
     */
    GetCode() {
        const sb = new ShaderBuilder();
        const useTimeInLib = !!this.useTimeInLibrary;
        const usedNames = collectUsedLibNames(this.shaderStatements);

        // ── Metadata ────────────────────────────────────────────────────────
        sb.add(`// ZzArt - ${this.GetGenerationString()}`);
        if (useTimeInLib) sb.add(`// (library time-mode enabled)`);
        sb.add();

        // ── Preamble ────────────────────────────────────────────────────────
        sb.add(buildPreamble(usedNames, this.usePalette, useTimeInLib));

        // ── Main logic ──────────────────────────────────────────────────────
        const s = 10;
        const uvsx = sb.float(s * this.uvScaleX);
        const uvsy = sb.float(s * this.uvScaleY);
        const uvox = sb.float(s * this.uvOffsetX);
        const uvoy = sb.float(s * this.uvOffsetY);
        const rotateSwizzle = state.rotateCanvas ^ this.rotate ? 'yxyx' : 'xyxy';

        sb.block('void mainImage(out vec4 a, in vec2 p)', (main) => {
            main.header('Coordinate Transformation');
            main.add(`a = p.${rotateSwizzle} / iResolution.${rotateSwizzle};`);
            main.add(`a.xywz *= vec2(${uvsx}, ${uvsy}).xyxy;`);
            main.add(`a.xywz += vec2(${uvox}, ${uvoy}).xyxy;`);
            main.add('a.w = 1.0; // Initialize alpha');
            main.add('vec4 b = a;');

            main.header(`Generated statements: ${this.shaderStatements.length}`);
            if (this.shaderStatements.length === 0) {
                main.add('b = a = vec4(0.0);');
            } else {
                const statementsLogic = () => {
                    for (const statement of this.shaderStatements) {
                        main.add(statement.GetGLSL());
                    }
                };

                if (this.iterationCount > 1) {
                    main.block(`for (int i = 0; i < ${this.iterationCount}; ++i)`, statementsLogic);
                } else {
                    statementsLogic();
                }
            }

            this._addColorizationCode(main);
        });

        return sb.toString();
    }

    /**
     * Internal helper to append colorization logic to the builder.
     * @private
     */
    _addColorizationCode(sb) {
        if (this.usePalette) {
            sb.header('Colorization (Cosine Palette)');
            sb.add(`a.x = a.x * ${sb.float(this.hueScale * 0.1)} + ${sb.float(this.hueOffset)};`);
            sb.add('a.xyz = b.x * CosinePalette(a.x,');
            sb.indent();
            this.paletteColors.forEach((color, i) => {
                const isLast = i === this.paletteColors.length - 1;
                sb.add(`${color.GetShaderCode()}${isLast ? '' : ','}`);
            });
            sb.outdent();
            sb.add(');');
        } else {
            sb.header('Colorization (Smooth HSV)');
            sb.add(`a.x = a.x * ${sb.float(this.hueScale)} + ${sb.float(this.hueOffset)};`);
            sb.add(`a.y *= ${sb.float(this.saturationScale)};`);
            sb.add('a.xyz = SmoothHSV(a.xyz);');
        }
    }

    Render(withFeedback = false, isPreview = false, gridScale = null) {
        let code = this.GetCode();
        if (withFeedback && this.useFeedback) {
            RenderShader(code, {
                isPreview,
                gridScale,
                useFeedback: true,
                feedbackBlendMode: this.feedbackBlendMode ?? 0,
                feedbackAmount: this.feedbackAmount ?? 0.92,
                feedbackMaskType: this.feedbackMaskType ?? 0,
                feedbackModType: this.feedbackModType ?? 0,
                feedbackModAmount: this.feedbackModAmount ?? 0.3,
                feedbackOpOrder: this.feedbackOpOrder ?? 0,
                feedbackSwap: this.feedbackSwap ?? 0,
                feedbackSharpen: this.feedbackSharpen ?? 0,
                feedbackBlur: this.feedbackBlur ?? 0,
                chromaKeyColor: this.chromaKeyColor,
                chromaThreshold: this.chromaThreshold ?? 0.1,
                chromaSoftness: this.chromaSoftness ?? 0.1,
                chromaMode: this.chromaMode ?? 0,
                preFilters: this.preFilters.filter((f) => f.enabled),
                postFilters: this.postFilters.filter((f) => f.enabled),
            });
        } else {
            RenderShader(code, {
                isPreview,
                gridScale,
                preFilters: this.preFilters.filter((f) => f.enabled),
                postFilters: this.postFilters.filter((f) => f.enabled),
            });
        }
    }

    GetGenerationString(shorten) {
        let string = '';

        if (this.IsSaveList()) {
            let page = (1 + this.saveListIndex / (state.gridSize * state.gridSize)) | 0;
            return 'Favorites Page: ' + page;
        }

        let seed = this.randSeedString ? this.randSeedString : this.randSeed;
        if (shorten) string += `${seed}-`;
        else string += this.IsVariation() ? 'Generation: ' : 'Seed: ';

        if (!this.IsVariation()) return string + seed;

        if (this.subGeneration <= 1) string += this.generation;
        else
            string +=
                this.generation +
                '-' +
                (this.subGeneration > 27
                    ? this.subGeneration
                    : String.fromCharCode(65 + this.subGeneration - 2));

        if (!shorten && this.IsVariation()) string += ` (${seed})`;

        return string;
    }
}
