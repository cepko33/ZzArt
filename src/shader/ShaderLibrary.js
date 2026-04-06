/**
 * ShaderLibrary.js
 *
 * Declarative GLSL standard-library for ZzArt.
 * This file aggregates functions from the src/shader/lib/ directory.
 */

import { ShaderBuilder } from "./ShaderBuilder";
import { MATH_FUNCTIONS } from "./lib/math";
import { DOMAIN_FUNCTIONS } from "./lib/domain";
import { NOISE_FUNCTIONS } from "./lib/noise";
import { SDF_FUNCTIONS } from "./lib/sdf";
import { COLOR_FUNCTIONS } from "./lib/color";

/**
 * Each entry in SHADER_LIB_FUNCTIONS describes one helper function that may
 * be emitted into the shader preamble.  Fields:
 *
 *   name        {string}   – GLSL function name referenced by ShaderStatement
 *   always      {boolean}  – if true, always emitted; otherwise only when the
 *                            function name appears in shaderStatements
 *   usesTime    {boolean}  – if true the body contains an `iTime` reference.
 *   body        {string}   – GLSL source (no trailing newline needed)
 *   bodyTimed   {string?}  – alternative body that mixes in iTime.
 */
export const SHADER_LIB_FUNCTIONS = [
  ...MATH_FUNCTIONS,
  ...DOMAIN_FUNCTIONS,
  ...NOISE_FUNCTIONS,
  ...SDF_FUNCTIONS,
  ...COLOR_FUNCTIONS,
];

/**
 * Names of all lib functions that ShaderStatement may randomly select.
 * Excludes palette/color helpers which are handled separately.
 */
const _PALETTE_NAMES = new Set(["CosinePalette", "SmoothHSV"]);
export const SHADER_LIB_NAMES = SHADER_LIB_FUNCTIONS.filter(
  (f) => !_PALETTE_NAMES.has(f.name),
).map((f) => f.name);

/**
 * Choices with weights for weighted random selection.
 */
export const SHADER_LIB_CHOICES = SHADER_LIB_FUNCTIONS.filter(
  (f) => !_PALETTE_NAMES.has(f.name),
).map((f) => ({ value: f.name, weight: f.weight || 0.5 }));

/**
 * Build a Set of function names used by the given array of ShaderStatements
 */
export function collectUsedLibNames(statements) {
  const used = new Set();
  for (const stmt of statements) {
    if (stmt.functionName) used.add(stmt.functionName);

    // Scan parameter string for nested library function calls
    if (typeof stmt.parameter === "string" && stmt.parameter.includes("(")) {
      for (const name of SHADER_LIB_NAMES) {
        if (stmt.parameter.includes(name + "(")) {
          used.add(name);
        }
      }
    }
  }
  return used;
}

/**
 * Emit the GLSL preamble for a shader.
 */
export function buildPreamble(usedNames, usePalette, useTimeInLib) {
  const sb = new ShaderBuilder();

  sb.header("Constants");
  sb.add("const float PI = 3.141592653589793;");

  sb.header("Library Functions");
  for (const fn of SHADER_LIB_FUNCTIONS) {
    if (fn.name === "CosinePalette" || fn.name === "SmoothHSV") continue;
    if (!usedNames.has(fn.name)) continue;

    const body = useTimeInLib && fn.bodyTimed ? fn.bodyTimed : fn.body;
    sb.add(body);
  }

  sb.header("Color Palette Helpers");
  const paletteFnName = usePalette ? "CosinePalette" : "SmoothHSV";
  const paletteFn = SHADER_LIB_FUNCTIONS.find((f) => f.name === paletteFnName);
  if (paletteFn) {
    const body =
      useTimeInLib && paletteFn.bodyTimed
        ? paletteFn.bodyTimed
        : paletteFn.body;
    sb.add(body);
  }

  return sb.toString();
}
