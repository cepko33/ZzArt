import { state } from '../state';
import { Rand, RandInt, RandBetween, RandSeeded, Clamp, Vector3 } from '../utils/math';
import { ShaderStatement } from './ShaderStatement';
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
            
        this.MakeAllObjectFloatsFixed(this);
    }
    
    GetCode() 
    {
        let s = 10;
        let uvsx = (s*this.uvScaleX).toFixed(3);
        let uvsy = (s*this.uvScaleY).toFixed(3);
        let uvox = (s*this.uvOffsetX).toFixed(3);
        let uvoy = (s*this.uvOffsetY).toFixed(3);
        
        let code = ``;
        code += `// ZzArt - ${this.GetGenerationString()}\n\n`;
        code += `const float PI=3.141592653589793;\n`;
        if (this.usePalette)
            code += `vec3 CosinePalette( float t, vec3 a, vec3 b, vec3 c, vec3 d ) { return a + b*cos( PI*2.*(c*t+d)); }\n`;
        else
            code += `vec3 SmoothHSV(vec3 c) { vec3 rgb = clamp(abs(mod(c.x*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.); return c.z * mix( vec3(1), rgb*rgb*(3.-2.*rgb), c.y); }\n`
        code += `vec4 lengthA(vec4 a)      { return vec4(length(a)); }\n`;
        code += `vec4 asinA(vec4 a)        { return asin(clamp(a,-1.,1.)); }\n`;
        code += `vec4 acosA(vec4 a)        { return acos(clamp(a,-1.,1.)); }\n`;
        code += `vec4 logA(vec4 a)         { return log(abs(a)); }\n`;
        code += `vec4 log2A(vec4 a)        { return log2(abs(a)); }\n`;
        code += `vec4 sqrtA(vec4 a)        { return sqrt(abs(a)); }\n`;
        code += `vec4 inversesqrtA(vec4 a) { return inversesqrt(abs(a)); }\n`;
        code += `vec4 pow2(vec4 a)         { return a*a; }\n`;
        code += `vec4 pow3(vec4 a)         { return a*a*a; }\n\n`;
        code += `void mainImage(out vec4 a, in vec2 p)\n{\n`;
        let rotateSwizzle = state.rotateCanvas^this.rotate? 'yxyx' : 'xyxy';
        code += `a=p.${rotateSwizzle}/iResolution.${rotateSwizzle};\n`;
        code += `a.xywz *= vec2(${uvsx}, ${uvsy}).xyxy;\n`;
        code += `a.xywz += vec2(${uvox}, ${uvoy}).xyxy;\n`;
        code += `vec4 b = a;\n\n`;
        code += `// Generated Code - Line Count: ${this.shaderStatements.length}\n`
        
        if (this.shaderStatements.length == 0)
            code += `b=a=vec4(0.0);\n`;
        else
        {
            if (this.iterationCount > 1)
                code += `for (int i = 0; i < ${this.iterationCount}; ++i)\n{\n`
            for(let statement of this.shaderStatements)
                code += statement.GetString() + '\n';
            if (this.iterationCount > 1)
                code += `}\n`
        }
        // use hsl color
        if (this.usePalette)
        {
            code += `\n// Cosine palettes by iq\n`
            code += `a.x = a.x * ${(this.hueScale*.1).toFixed(3)}+${this.hueOffset.toFixed(3)};\n`
            code += `a.xyz = b.x * CosinePalette(a.x`
            for(let color of this.paletteColors)
                code += `,\n ${color.GetShaderCode()}`;
            code += `);\n`;
        }
        else
        {
            code += `\n// Smooth HSV by iq\n`
            code += `a.x = a.x * ${this.hueScale.toFixed(3)}+${this.hueOffset.toFixed(3)};\n`;
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
