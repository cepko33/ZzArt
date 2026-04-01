import { RandInt, RandBetween, Rand, ShuffleArray } from '../utils/math';

export const shaderRandomizer =
{
    AssignmentOperator: function()
    {
        let f = ['=','+=','-=','*=','/='];
        return f[RandInt(f.length)];
    },
    FunctionName: function()
    {
        if (Rand() < .5)
            return '';

        let f =
        [
            'sin','cos','normalize','lengthA',
            'tan','asinA','acosA','atan',
            'logA','log2A','exp','exp2',
            'sqrtA','inversesqrtA','fract',
            'abs','sign','floor','ceil',
            'pow2','pow3'
        ];
        return f[RandInt(f.length)];
    },
    Output: function()
    {
        let f = ['a','b'];
        return f[RandInt(f.length)];
    },
    Value: function()
    {
        let v = RandBetween(0,1);
        v = v * v;
        v *= 10;
        return RandInt(2)? v : -v;
    },
    Parameter: function()
    {
        let f = ['a','b','']
        return f[RandInt(f.length)];
    },
    Swizzle: function(noDuplicates)
    {
        if (noDuplicates)
        {
            let s = ['x','y','z','w'];
            s = ShuffleArray(s);
            return s.join('');
        }

        let s = ['x','y','z','w'];
        return s[RandInt(s.length)] + s[RandInt(s.length)] + s[RandInt(s.length)] + s[RandInt(s.length)];
    }
};

export class ShaderStatement
{
    constructor()
    {
        this.output = 'a';
        this.outputSwizzle = 'xyzw';
        this.assignmentOperator = '=';
        this.functionName = '';
        this.parameter = 'a';
        this.valueX = 1;
        this.valueY = 1;
        this.valueZ = 1;
        this.valueW = 1;
        this.parameterSwizzle = 'xyzw';
    }
    
    Randomize()
    {
        this.output = shaderRandomizer.Output();
        this.assignmentOperator = shaderRandomizer.AssignmentOperator();
        this.functionName = shaderRandomizer.FunctionName();
        this.parameter = shaderRandomizer.Parameter();
        this.valueX = shaderRandomizer.Value();
        this.valueY = shaderRandomizer.Value();
        this.valueZ = shaderRandomizer.Value();
        this.valueW = shaderRandomizer.Value();
        this.outputSwizzle = shaderRandomizer.Swizzle(1);
        this.parameterSwizzle = shaderRandomizer.Swizzle();
    }
    
    Mutate()
    {
        let r = RandInt(10);
        switch (r)
        {
            case 0: this.output = shaderRandomizer.Output(); break;
            case 1: this.assignmentOperator = shaderRandomizer.AssignmentOperator(); break;
            case 2: this.functionName = shaderRandomizer.FunctionName(); break;
            case 3: this.outputSwizzle = shaderRandomizer.Swizzle(1); break;
            case 4: this.parameter = shaderRandomizer.Parameter(); break;
            case 5: this.parameterSwizzle = shaderRandomizer.Swizzle(); break;
            case 6: this.valueX = shaderRandomizer.Value(); break;
            case 7: this.valueY = shaderRandomizer.Value(); break;
            case 8: this.valueZ = shaderRandomizer.Value(); break;
            case 9: this.valueW = shaderRandomizer.Value(); break;
        }
        
        this.valueX += 0.05*RandBetween(-1,1);
        this.valueY += 0.05*RandBetween(-1,1);
        this.valueZ += 0.05*RandBetween(-1,1);
        this.valueW += 0.05*RandBetween(-1,1);
    }
    
    GetString()
    {
        let parameter = '' + this.parameter;
        if (parameter == '')
            parameter = `vec4(${this.valueX.toFixed(3)}, ${this.valueY.toFixed(3)}, ${this.valueZ.toFixed(3)}, ${this.valueW.toFixed(3)})`;
         
        let code;
        code = this.output + '.' + this.outputSwizzle;
        code += ' ' + this.assignmentOperator + ' ' + this.functionName
        code += '(' + parameter + ')'
        code += '.' + this.parameterSwizzle;
        code += ';';
        return code;
    }
}
