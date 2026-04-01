import { state } from '../state';
import { Rand, RandInt, RandBetween, RandSeeded, Clamp, Vector3 } from '../utils/math';
import { ShaderStatement } from './ShaderStatement';
import { buildPreamble, collectUsedLibNames } from './ShaderLibrary';
import { RenderShader } from '../webgl';

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
    
    Randomize()
    {
        let statementCount = parseInt(state.input_randomizeLength.value);
        if (statementCount <0)
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
    
    Render() 
    {
        let code = this.GetCode();
        RenderShader(code);
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
