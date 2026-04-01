import { state } from './state';

export function InitWebgl() 
{
    let x = state.canvasContext_shader;

    // create simple pass through vertex shader
    state.vertexShader=x.createShader(x.VERTEX_SHADER);
    x.shaderSource(state.vertexShader,"attribute vec4 p;void main(){gl_Position=p;}")
    x.compileShader(state.vertexShader);
    let compiled = x.getShaderParameter(state.vertexShader, x.COMPILE_STATUS);
    if (!compiled)
    {
        let shaderLog = x.getShaderInfoLog(state.vertexShader);
        state.textarea_debug.value = compiled? "" : "VERTEX SHADER ERROR!\n" + shaderLog;
        state.vertexShader = 0;
        return;
    }
    
    // create vertex buffer that is a giant triangle to cover the viewport
    let vertexBuffer=x.ARRAY_BUFFER;
    x.bindBuffer(vertexBuffer,x.createBuffer());
    x.bufferData(vertexBuffer,new Int8Array([-3,1,1,-3,1,1]),x.STATIC_DRAW);
    x.enableVertexAttribArray(0);
    x.vertexAttribPointer(0,2,x.BYTE,0,0,0); // 2D vertex
}

export function RenderShader(code) 
{
    if (!state.vertexShader)
        return;
    
    // create pixel shader
    let x = state.canvasContext_shader;
    let shaderProgram = x.createProgram();
    let pixelShader = x.createShader(x.FRAGMENT_SHADER)
    let shaderProgramCode = 
        "precision mediump float;"+
        `const vec3 iResolution = vec3(${state.canvas_shader.width},${state.canvas_shader.height},0.);`+
        code+
        `\nvoid main(){mainImage(gl_FragColor,gl_FragCoord.xy);gl_FragColor.a=1.;}`
    x.shaderSource(pixelShader, shaderProgramCode)
    x.compileShader(pixelShader);
    
    // check for errors
    let debugOutput="";
    let compiled = x.getShaderParameter(pixelShader, x.COMPILE_STATUS);
    let shaderLog = x.getShaderInfoLog(pixelShader);
    state.textarea_debug.value = compiled? "" : "FRAGMENT SHADER ERROR!\n" + shaderLog;
    if (!compiled)
    {
        shaderProgram = 0;
        return;
    }

    // link program
    x.attachShader(shaderProgram,state.vertexShader);
    x.attachShader(shaderProgram, pixelShader);
    x.linkProgram(shaderProgram);
    let linkGood = x.getProgramParameter(shaderProgram, x.LINK_STATUS);
    if (!linkGood)
    {
        // something went wrong with the link
        state.textarea_debug.value = "LINK ERROR!\n" + x.getProgramInfoLog(shaderProgram);
        return;
    }
    
    // render
    x.viewport(0, 0, state.canvas_shader.width, state.canvas_shader.height);
    x.useProgram(shaderProgram);
    x.drawArrays(x.TRIANGLE_FAN, 0, 3);
}
