/**
 * ShaderBuilder.js
 *
 * A utility class for programmatic GLSL code generation.
 * Handles indentation, line management, and consistent formatting.
 */
export class ShaderBuilder {
  constructor() {
    this.lines = [];
    this._indent = 0;
  }

  /**
   * Add a single line of code with current indentation.
   * @param {string} line
   */
  add(line = "") {
    const space = "  ".repeat(this._indent);
    this.lines.push(space + line);
    return this;
  }

  /**
   * Add multiple lines by splitting a string.
   * @param {string} multiLine
   */
  addLines(multiLine) {
    const chunks = multiLine.split("\n");
    for (const chunk of chunks) {
      this.add(chunk.trim());
    }
    return this;
  }

  /**
   * Increase indentation level.
   */
  indent() {
    this._indent++;
    return this;
  }

  /**
   * Decrease indentation level.
   */
  outdent() {
    this._indent = Math.max(0, this._indent - 1);
    return this;
  }

  /**
   * Create a scoped block { ... } with indentation.
   * @param {string} header e.g. "void main()" or "if (cond)"
   * @param {Function} callback function that adds content to this builder
   */
  block(header, callback) {
    this.add(`${header} {`);
    this.indent();
    callback(this);
    this.outdent();
    this.add("}");
    return this;
  }

  /**
   * Format a number as a GLSL float (always with a decimal).
   * @param {number} val
   * @param {number} precision
   */
  float(val, precision = 3) {
    let s = val.toFixed(precision);
    if (!s.includes(".")) s += ".0";
    return s;
  }

  /**
   * Final string output.
   */
  toString() {
    return this.lines.join("\n");
  }

  /**
   * Shorthand for creating a comment header.
   */
  header(text) {
    this.add();
    this.add(`// ── ${text} ───────────────────`);
    return this;
  }
}
