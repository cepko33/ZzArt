import { state } from '../state';
import { Rand, RandInt, RandBetween, RandSeeded, Clamp, Vector3 } from '../utils/math';
import { ShaderStatement } from './ShaderStatement';
import { buildPreamble, collectUsedLibNames } from './ShaderLibrary';
import { RenderShader, ClearFeedback } from '../webgl';

export class ShaderObject
{
    constructor()
    {
        this.shaderStatements = [];
        this.randSeed = state.randSeed;
        this.randSeedString = state.randSeedString.length? state.randSeedString : ''+state.randSeed;
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
        this.uniqueID=++state.uniqueID;
        
        // Feedback / compositing
        this.useFeedback = 0;
        this.feedbackBlendMode = 0;   // 0-8, see ShaderLibrary.buildCompositeShader
        this.feedbackAmount = 0.92;   // 0-1, weight toward previous frame
        this.feedbackMaskType = 0;    // 0-4, mask type for spatially-varying blend
        this.feedbackModType = 0;     // 0-4, UV modulation applied to previous-frame sample
        this.feedbackModAmount = 0.3; // 0-1, modulation strength
        this.feedbackOpOrder = 0;     // 0-5, how mask and modulation are cross-wired
        this.feedbackSwap = 0;        // 0/1, swap curr/prev texture roles before compositing
        this.feedbackSharpen = 0;     // 0-1, sharpen amount for final feedback pass
        this.feedbackBlur = 0;        // 0-1, blur amount for final feedback pass
        
        // Chroma Key settings
        this.chromaMode = 0;          // 0 RGB, 1 Hue, 2 Sat, 3 Lum
        this.chromaKeyColor = new Vector3(0, 1, 0); // Default to green
        this.chromaThreshold = 0.1;
        this.chromaSoftness = 0.1;
    }
    
    SetGridPos(X,Y) { this.gridPosX = X; this.gridPosY = Y; }
    IsVariation() { return this.gridPosX >= 0; }
    IsSaveList() { return this.saveListIndex >= 0; };
    
    MakeAllObjectFloatsFixed(object, digits=3)
    {
        // keep floats small
        for (let key in object)
        {
            let subObject = object[key];
            if (typeof subObject === 'object')
                this.MakeAllObjectFloatsFixed(subObject)
            else if (typeof subObject === 'number')
                object[key] = parseFloat(subObject.toFixed(digits));
        }
    }
    
    Randomize(keepFeedback = false)
    {
        let statementCount = state.settings.randomizeLength;
        if (statementCount < 0)
            statementCount = 0;
        
        this.usePalette = 1;
        this.useTimeInLibrary = Rand() < 0.5 ? 1 : 0;
        this.hueOffset = Rand();
        this.hueScale = RandBetween(-1,1);
        this.saturationScale = Rand();
        this.generation = 0;
        this.subGeneration = 0;
        this.shaderStatements = [];
        this.uvOffsetX = RandBetween(-1,1);
        this.uvOffsetY = RandBetween(-1,1);
        this.uvScaleX = RandBetween(-1,1);
        this.uvScaleY = RandBetween(-1,1);
        this.iterationCount = state.startIterations;
        for(let i=statementCount; i--;)
        {
            let statement = new ShaderStatement();
            statement.Randomize();
            this.shaderStatements.push(statement);
        }
        
        for(let color of this.paletteColors)
            color.Randomize(0,1);
        
        // Feedback: off by default, 20 % chance to enable
        if (!keepFeedback)
        {
            this.useFeedback = Rand() < 0.2 ? 1 : 0;
            if (this.useFeedback)
            {
                this.feedbackBlendMode  = RandInt(9);
                this.feedbackAmount     = RandBetween(0.80, 0.97);
                this.feedbackMaskType   = RandInt(5);
                this.feedbackModType    = RandInt(5);
                this.feedbackModAmount  = RandBetween(0.1, 0.6);
                this.feedbackOpOrder    = RandInt(6);
                this.feedbackSwap       = Rand() < 0.3 ? 1 : 0;
                this.feedbackSharpen    = Rand() < 0.15 ? RandBetween(0.1, 0.4) : 0;
                this.feedbackBlur       = Rand() < 0.15 ? RandBetween(0.1, 0.4) : 0;
                this.chromaMode         = RandInt(4);
                this.chromaKeyColor.Randomize(0, 1);
                this.chromaThreshold    = RandBetween(0.01, 0.2);
                this.chromaSoftness     = RandBetween(0.01, 0.2);
            }
        }
            
        this.MakeAllObjectFloatsFixed(this);
    }
    
    Clone() 
    {
        let clone = Object.assign(new ShaderObject(), this);
        clone.shaderStatements = [];
        for(let statement of this.shaderStatements)
            clone.shaderStatements.push(Object.assign(new ShaderStatement(), statement));
        clone.paletteColors = [];
        for(let color of this.paletteColors)
            clone.paletteColors.push(Object.assign(new Vector3(), color));
        clone.chromaKeyColor = Object.assign(new Vector3(), this.chromaKeyColor);
            
        // fix old shaders that had too high iterations
        clone.iterationCount = Clamp(parseInt(clone.iterationCount),1,state.maxIterations);
        return clone;
    }
    
    Mutate() 
    {   
        this.uniqueID = RandSeeded();
        this.subGeneration = 0;
        ++this.generation;
        
        if (this.shaderStatements.length <= 2)
        {
            this.Randomize();
            return;
        }
        
        if (Rand() < .3)
        {
            // remove statement
            let r = RandInt(this.shaderStatements.length);
            let s = this.shaderStatements[r];
            this.shaderStatements.splice(r, 1);
        }
        
        if (Rand() < .5)
        {
            // change order or a statement
            let r = RandInt(this.shaderStatements.length);
            let s = this.shaderStatements[r];
            this.shaderStatements.splice(r, 1);
            r = RandInt(this.shaderStatements.length+1);
            this.shaderStatements.splice(r, 0, s);
        }
        
        for(let i=RandInt(2); i--;)
        {
            // mutate statements
            let r = RandInt(this.shaderStatements.length);
            this.shaderStatements[r].Mutate();
        }
        
        if (Rand() < .2)
        {
            // insert random statement
            let statement = new ShaderStatement();
            statement.Randomize();
            let r = RandInt(this.shaderStatements.length+1);
            this.shaderStatements.splice(r, 0, statement);
        }
        
        // mutate colors
        this.hueOffset += RandBetween(-.1,.1)
        if (Rand() < .2)
            this.hueOffset = Rand();
        if (Rand() < .2)
            this.saturationScale = Rand();
        if (Rand() < .2)
            this.hueScale = RandBetween(-1,1);
        if (Rand() < .4)
        {
            for(let color of this.paletteColors)
                color.Randomize(0,1);
        }
        
        // mutate position
        if (Rand() < .1)
        {
            this.uvOffsetX = RandBetween(-1,1);
            this.uvOffsetY = RandBetween(-1,1);
            this.uvScaleX = RandBetween(-1,1);
            this.uvScaleY = RandBetween(-1,1);
        }
        else
        {
            this.uvOffsetX += RandBetween(-.1,.1);
            this.uvOffsetY += RandBetween(-.1,.1);
            this.uvScaleX += RandBetween(-.1,.1);
            this.uvScaleY += RandBetween(-.1,.1);
        }
        
        if (Rand() < .1)
            this.rotate = !this.rotate;
            
        if (Rand() < .1)
            this.iterationCount += RandInt(3)-1;
        
        // occasionally flip the timed-library flag for extra variety
        if (Rand() < .15)
            this.useTimeInLibrary = this.useTimeInLibrary ? 0 : 1;
        
        // Feedback mutations
        if (!state.feedbackLocked)
        {
            if (Rand() < .08)
                this.useFeedback = this.useFeedback ? 0 : 1;
            if (this.useFeedback)
            {
                if (Rand() < .15)
                    this.feedbackBlendMode = RandInt(9);
                if (Rand() < .10)
                    this.feedbackMaskType = RandInt(5);
                if (Rand() < .10)
                    this.feedbackModType = RandInt(5);
                if (Rand() < .10)
                    this.feedbackOpOrder = RandInt(6);
                if (Rand() < .08)
                    this.feedbackSwap = this.feedbackSwap ? 0 : 1;
                if (Rand() < .08)
                    this.feedbackSharpen = Clamp(this.feedbackSharpen + RandBetween(-.1, .1), 0, 1);
                if (Rand() < .08)
                    this.feedbackBlur = Clamp(this.feedbackBlur + RandBetween(-.1, .1), 0, 1);
                if (Rand() < .10)
                {
                    this.chromaMode = RandInt(4);
                    this.chromaKeyColor.Randomize(0, 1);
                }
                this.feedbackAmount    = Clamp(this.feedbackAmount    + RandBetween(-.05, .05), 0.5, 0.99);
                this.feedbackModAmount = Clamp(this.feedbackModAmount + RandBetween(-.08, .08), 0.0, 1.0);
                this.chromaThreshold   = Clamp(this.chromaThreshold   + RandBetween(-.03, .03), 0.0, 1.0);
                this.chromaSoftness    = Clamp(this.chromaSoftness    + RandBetween(-.03, .03), 0.0, 1.0);
            }
        }
            
        this.MakeAllObjectFloatsFixed(this);
    }
    
    GetCode() 
    {
        const s = 10;
        const uvsx = (s * this.uvScaleX).toFixed(3);
        const uvsy = (s * this.uvScaleY).toFixed(3);
        const uvox = (s * this.uvOffsetX).toFixed(3);
        const uvoy = (s * this.uvOffsetY).toFixed(3);
        const useTimeInLib = !!this.useTimeInLibrary;

        // ── Preamble ────────────────────────────────────────────────────────
        const usedNames = collectUsedLibNames(this.shaderStatements);
        let code = `// ZzArt - ${this.GetGenerationString()}\n`;
        if (useTimeInLib) code += `// (library time-mode enabled)\n`;
        code += `\n`;
        code += buildPreamble(usedNames, this.usePalette, useTimeInLib);

        // ── Main body ───────────────────────────────────────────────────────
        const rotateSwizzle = state.rotateCanvas ^ this.rotate ? 'yxyx' : 'xyxy';
        code += `void mainImage(out vec4 a, in vec2 p)\n{\n`;
        code += `a = p.${rotateSwizzle} / iResolution.${rotateSwizzle};\n`;
        code += `a.xywz *= vec2(${uvsx}, ${uvsy}).xyxy;\n`;
        code += `a.xywz += vec2(${uvox}, ${uvoy}).xyxy;\n`;
        code += `a.w = 1.0; // Initialize alpha\n`;
        code += `vec4 b = a;\n\n`;
        code += `// Generated statements: ${this.shaderStatements.length}\n`;

        if (this.shaderStatements.length === 0)
        {
            code += `b = a = vec4(0.0);\n`;
        }
        else
        {
            if (this.iterationCount > 1)
                code += `for (int i = 0; i < ${this.iterationCount}; ++i) {\n`;
            for (const statement of this.shaderStatements)
                code += statement.GetString() + '\n';
            if (this.iterationCount > 1)
                code += `}\n`;
        }

        // ── Colorization ────────────────────────────────────────────────────
        if (this.usePalette)
        {
            code += `\n// Cosine palettes by iq\n`;
            code += `a.x = a.x * ${(this.hueScale * .1).toFixed(3)} + ${this.hueOffset.toFixed(3)};\n`;
            code += `a.xyz = b.x * CosinePalette(a.x`;
            for (const color of this.paletteColors)
                code += `,\n    ${color.GetShaderCode()}`;
            code += `);\n`;
        }
        else
        {
            code += `\n// Smooth HSV by iq\n`;
            code += `a.x = a.x * ${this.hueScale.toFixed(3)} + ${this.hueOffset.toFixed(3)};\n`;
            code += `a.y *= ${this.saturationScale.toFixed(3)};\n`;
            code += `a.xyz = SmoothHSV(a.xyz);\n`;
        }
        code += `}`;
        return code;
    }
    
    /**
     * Render this shader.
     * @param {boolean} [withFeedback=false]  When true, passes feedback
     *   options to RenderShader so the two-pass composite path is used.
     *   Grid / thumbnail renders always skip feedback.
     */
    Render(withFeedback = false)
    {
        let code = this.GetCode();
        if (withFeedback && this.useFeedback)
        {
            RenderShader(code, {
                useFeedback:        true,
                feedbackBlendMode:  this.feedbackBlendMode  ?? 0,
                feedbackAmount:     this.feedbackAmount     ?? 0.92,
                feedbackMaskType:   this.feedbackMaskType   ?? 0,
                feedbackModType:    this.feedbackModType    ?? 0,
                feedbackModAmount:  this.feedbackModAmount  ?? 0.3,
                feedbackOpOrder:    this.feedbackOpOrder    ?? 0,
                feedbackSwap:       this.feedbackSwap       ?? 0,
                feedbackSharpen:    this.feedbackSharpen    ?? 0,
                feedbackBlur:       this.feedbackBlur       ?? 0,
                chromaKeyColor:     this.chromaKeyColor,
                chromaThreshold:    this.chromaThreshold    ?? 0.1,
                chromaSoftness:     this.chromaSoftness     ?? 0.1,
                chromaMode:         this.chromaMode         ?? 0,
            });
        }
        else
        {
            RenderShader(code);
        }
    }
    
    GetGenerationString(shorten)
    {
        let string = ''
        
        if (this.IsSaveList())
        {
            let page = 1+this.saveListIndex / (state.gridSize*state.gridSize)|0; 
            return 'Favorites Page: ' + page;
        }
        
        let seed = this.randSeedString?this.randSeedString:this.randSeed;
        if (shorten)
            string += `${seed}-`;
        else
            string += this.IsVariation()? 'Generation: ' : 'Seed: '
            
        if (!this.IsVariation())
            return string + seed;
        
        if (this.subGeneration <= 1)
            string += this.generation;
        else
            string += this.generation + '-' + (this.subGeneration>27?this.subGeneration:String.fromCharCode(65+this.subGeneration-2));
            
        if (!shorten && this.IsVariation())
            string += ` (${seed})`
            
        return string;
    }
};
