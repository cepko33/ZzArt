import { RandInt, RandBetween, Rand, ShuffleArray } from "../utils/math";
import { SHADER_LIB_NAMES } from "./ShaderLibrary";

export const shaderRandomizer = {
  AssignmentOperator: function () {
    let f = ["=", "+=", "-=", "*=", "/="];
    return f[RandInt(f.length)];
  },
  FunctionName: function () {
    if (Rand() < 0.1) return "";

    // Built-in GLSL functions that need no stdlib wrapper
    const builtins = [
      "sin",
      "cos",
      "tan",
      "atan",
      "exp",
      "exp2",
      "fract",
      "abs",
      "sign",
      "floor",
      "ceil",
      "normalize",
    ];

    // All stdlib wrappers defined in ShaderLibrary
    const all = [...builtins, ...SHADER_LIB_NAMES];
    return all[RandInt(all.length)];
  },
  Output: function () {
    let f = ["a", "b"];
    return f[RandInt(f.length)];
  },
  Value: function () {
    let v = RandBetween(0, 1);
    v = v * v;
    v *= 10;
    return RandInt(2) ? v : -v;
  },
  Parameter: function () {
    let f = ["a", "b", ""];
    return f[RandInt(f.length)];
  },
  TimeUsage: function () {
    if (Rand() < 0.01) return 0;
    return RandInt(5);
  },
  Swizzle: function (noDuplicates) {
    if (noDuplicates) {
      let s = ["x", "y", "z", "w"];
      s = ShuffleArray(s);
      return s.join("");
    }

    let s = ["x", "y", "z", "w"];
    return (
      s[RandInt(s.length)] +
      s[RandInt(s.length)] +
      s[RandInt(s.length)] +
      s[RandInt(s.length)]
    );
  },
};

export class ShaderStatement {
  constructor() {
    this.output = "a";
    this.outputSwizzle = "xyzw";
    this.assignmentOperator = "=";
    this.functionName = "";
    this.parameter = "a";
    this.valueX = 1;
    this.valueY = 1;
    this.valueZ = 1;
    this.valueW = 1;
    this.parameterSwizzle = "xyzw";
    this.timeUsage = 0;
  }

  Randomize() {
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
    this.timeUsage = shaderRandomizer.TimeUsage();
  }

  Mutate() {
    let r = RandInt(11);
    switch (r) {
      case 0:
        this.output = shaderRandomizer.Output();
        break;
      case 1:
        this.assignmentOperator = shaderRandomizer.AssignmentOperator();
        break;
      case 2:
        this.functionName = shaderRandomizer.FunctionName();
        break;
      case 3:
        this.outputSwizzle = shaderRandomizer.Swizzle(1);
        break;
      case 4:
        this.parameter = shaderRandomizer.Parameter();
        break;
      case 5:
        this.parameterSwizzle = shaderRandomizer.Swizzle();
        break;
      case 6:
        this.valueX = shaderRandomizer.Value();
        break;
      case 7:
        this.valueY = shaderRandomizer.Value();
        break;
      case 8:
        this.valueZ = shaderRandomizer.Value();
        break;
      case 9:
        this.valueW = shaderRandomizer.Value();
        break;
      case 10:
        this.timeUsage = shaderRandomizer.TimeUsage();
        break;
    }

    this.valueX += 0.05 * RandBetween(-1, 1);
    this.valueY += 0.05 * RandBetween(-1, 1);
    this.valueZ += 0.05 * RandBetween(-1, 1);
    this.valueW += 0.05 * RandBetween(-1, 1);
  }

  /**
   * Internal helper to format the vec4(x, y, z, w) parameter from individual values.
   */
  _getFormattedVec4() {
    const format = (v, usage, timeIndex) =>
      usage === timeIndex ? "iTime" : v.toFixed(3);

    const x = format(this.valueX, this.timeUsage, 1);
    const y = format(this.valueY, this.timeUsage, 2);
    const z = format(this.valueZ, this.timeUsage, 3);
    const w = format(this.valueW, this.timeUsage, 4);

    return `vec4(${x}, ${y}, ${z}, ${w})`;
  }

  /**
   * Generate the GLSL statement string.
   */
  GetGLSL() {
    const parameter =
      this.parameter === "" ? this._getFormattedVec4() : this.parameter;

    // Structure: output.swizzle operator function(parameter).swizzle;
    return `${this.output}.${this.outputSwizzle} ${this.assignmentOperator} ${this.functionName}(${parameter}).${this.parameterSwizzle};`;
  }

  /**
   * Legacy alias for GetGLSL
   */
  GetString() {
    return this.GetGLSL();
  }
}
