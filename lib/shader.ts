import { Vec3, Vec4 } from "./algebra"
import { Model } from "./model"

export interface ShaderSourceProvider {
  getVertexSource(): string 
  getFragementSource(): string
}

export class Shader {
  constructor(readonly gl: WebGL2RenderingContext, shaderSourceProvider: ShaderSourceProvider) {
    const { vs, fs } = this.compile(gl, shaderSourceProvider)
    this.program = this.link(gl, vs, fs)
  }

  private compile(gl: WebGL2RenderingContext, shaderSourceProvider: ShaderSourceProvider) {
    const vs = gl.createShader(gl.VERTEX_SHADER)
    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    if (vs === null || fs === null) {
      throw new Error("WebGL failed at creating shader")
    }
    gl.shaderSource(vs, shaderSourceProvider.getVertexSource())
    gl.shaderSource(fs, shaderSourceProvider.getFragementSource())
    gl.compileShader(vs)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      throw new Error(`WebGL failed at compiling vertex shader ${gl.getShaderInfoLog(vs)}`)
    }
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      throw new Error(`WebGL failed at compiling fragment shader ${gl.getShaderInfoLog(fs)}`)
    }
    return { vs, fs }
  }

  private link(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader) {
    const program = gl.createProgram()
    if (program === null) {
      throw new Error("WebGL failed at creating program")
    }
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`WebGL failed at linking program ${gl.getProgramInfoLog(program)}`)
    }
    return program
  }

  use() {
    this.gl.useProgram(this.program)
  }

  draw(models: Model[]) {
    models.forEach(model => {
      this.setMatrix("model", model.matrix)
      model.meshes.forEach(mesh => {
        this.setMatrix("mesh", mesh.matrix)
        mesh.primitives.forEach(primitive => primitive.draw(this.gl))
      })
    })
  }

  setMatrix(name: string, value: number[]) {
    this.gl.uniformMatrix4fv(this.getUniformLocation(name), false, value)
  }

  setFloat(name: string, value: number) {
    this.gl.uniform1f(this.getUniformLocation(name), value)
  }

  setFloats(name: string, value: Float32Array) {
    this.gl.uniform1fv(this.getUniformLocation(name), value)
  }

  setVector3(name: string, value: Vec3) {
    this.gl.uniform3fv(this.getUniformLocation(name), value)
  }

  setVector4(name: string, value: Vec4) {
    this.gl.uniform4fv(this.getUniformLocation(name), value)
  }

  setInt(name: string, value: number) {
    this.gl.uniform1i(this.getUniformLocation(name), value)
  }

  private getUniformLocation(name: string) {
    if (!this.uniformLocations.has(name)) {
      const location = this.gl.getUniformLocation(this.program, name)
      if (location === null) {
        throw new Error(`WebGL failed at locating uniform ${name}`)
      }
      this.uniformLocations.set(name, location)
    }
    return this.uniformLocations.get(name)!
  }

  program: WebGLProgram
  uniformLocations = new Map<string, WebGLUniformLocation>
}

export class BasicShader implements ShaderSourceProvider {
  getVertexSource() {
    return `#version 300 es
    layout(location = 0) in vec3 position;
    layout(location = 1) in vec2 texCoord;
    layout(location = 2) in vec3 normal;
    uniform mat4 camera;
    uniform mat4 model;
    uniform mat4 mesh;
    out vec2 uv;
    out vec3 FragNormal;
    void main() {
      gl_Position = camera * model * mesh * vec4(position, 1.0);
      uv = texCoord;
      FragNormal = (model * mesh * vec4(normal, 0.0)).xyz;
    }`
  }

  getFragementSource() {
    return `#version 300 es
    precision highp float;
    in vec2 uv;
    in vec3 FragNormal;
    uniform sampler2D sampler;
    out vec4 FragColor;
    void main() {
      FragColor = texture(sampler, uv);
    }`
  }
}

export class ColorShader implements ShaderSourceProvider {
  getVertexSource(): string {
    return `#version 300 es
    layout(location = 0) in vec3 position;
    uniform mat4 camera;
    uniform mat4 model;
    uniform mat4 mesh;
    void main() {
      gl_Position = camera * model * mesh * vec4(position, 1.0);
    }`
  }
  getFragementSource(): string {
    return `#version 300 es
    precision highp float;
    uniform vec3 color;
    out vec4 FragColor;
    void main() {
      FragColor = vec4(color, 1.0);
    }`
  }
}

export class PhongShader implements ShaderSourceProvider {
  getVertexSource(): string {
    return `#version 300 es
    layout(location = 0) in vec3 position;
    layout(location = 1) in vec2 texCoord;
    layout(location = 2) in vec3 normal;

    uniform mat4 camera;
    uniform mat4 model;
    uniform mat4 mesh;

    out vec3 vs_position;
    out vec3 vs_normal;
    out vec2 vs_texCoord;

    void main() {
      vec4 modelMeshPos = model * mesh * vec4(position, 1.0);
      vs_position = modelMeshPos.xyz;
      vs_normal = mat3(model * mesh) * normal;
      vs_texCoord = texCoord;
      gl_Position = camera * modelMeshPos;
    }`
  }
  getFragementSource(): string {
    return `#version 300 es
    precision highp float;
    in vec3 vs_position;
    in vec3 vs_normal;
    in vec2 vs_texCoord;

    uniform sampler2D sampler;
    uniform vec3 Kd;
    uniform vec3 Ks;
    uniform vec4 lightPos;
    uniform vec3 lightIntensity;
    uniform vec3 cameraPos;

    out vec4 FragColor;

    vec3 blinnPhong() {
      vec3 color = texture(sampler, vs_texCoord).rgb;
      color = pow(color, vec3(2.2));
    
      vec3 ambient = 0.05 * color;
    
      vec3 lightDir;
      if (lightPos.w == 1.0) {
        lightDir = normalize(lightPos.xyz - vs_position);
      } else if (lightPos.w == 0.0) {
        lightDir = normalize(lightPos.xyz);
      }
      vec3 normal = normalize(vs_normal);
      float diff = max(dot(lightDir, normal), 0.0);
      vec3 light_atten_coff = lightIntensity / pow(length(lightPos.xyz - vs_position), 2.0);
      vec3 diffuse = diff * light_atten_coff * color;
    
      vec3 viewDir = normalize(cameraPos - vs_position);
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(halfDir, normal), 0.0), 32.0);
      vec3 specular = Ks * light_atten_coff * spec;
    
      vec3 radiance = (ambient + diffuse + specular);
      vec3 phongColor = pow(radiance, vec3(1.0 / 2.2));
      return phongColor;
    }

    void main() {
      FragColor = vec4(blinnPhong(), 1.0);
    }`
  }
  
}

export class ShadowShader implements ShaderSourceProvider {
  getVertexSource(): string {
    return `#version 300 es
    layout(location = 0) in vec3 position;
    layout(location = 1) in vec2 texCoord;
    layout(location = 2) in vec3 normal;

    uniform mat4 camera;
    uniform mat4 model;
    uniform mat4 mesh;
    uniform mat4 shadow;

    out vec3 vs_position;
    out vec3 vs_normal;
    out vec2 vs_texCoord;
    out vec4 vs_shadowCoord;

    void main() {
      vec4 modelMeshPos = model * mesh * vec4(position, 1.0);
      vs_position = modelMeshPos.xyz;
      vs_normal = mat3(model * mesh) * normal;
      vs_texCoord = texCoord;
      vs_shadowCoord = shadow * modelMeshPos;
      gl_Position = camera * modelMeshPos;
    }`
  }
  getFragementSource(): string {
    return `#version 300 es
    precision highp float;
    in vec3 vs_position;
    in vec3 vs_normal;
    in vec2 vs_texCoord;
    in vec4 vs_shadowCoord;

    uniform sampler2D sampler;
    uniform sampler2D shadowMap;
    uniform vec3 Kd;
    uniform vec3 Ks;
    uniform vec4 lightPos;
    uniform vec3 lightIntensity;
    uniform vec3 cameraPos;
    uniform float c;

    #define NUM_SAMPLES 20
    #define NUM_RINGS 10
    #define PI 3.141592653589793
    #define PI2 6.283185307179586

    out vec4 FragColor;

    vec3 blinnPhong() {
      vec3 color = texture(sampler, vs_texCoord).rgb;
      color = pow(color, vec3(2.2));
    
      vec3 ambient = 0.05 * color;
    
      vec3 lightDir;
      if (lightPos.w == 1.0) {
        lightDir = normalize(lightPos.xyz - vs_position);
      } else if (lightPos.w == 0.0) {
        lightDir = normalize(lightPos.xyz);
      }
      vec3 normal = normalize(vs_normal);
      float diff = max(dot(lightDir, normal), 0.0);
      vec3 light_atten_coff = lightIntensity / pow(length(lightPos.xyz - vs_position), 2.0);
      vec3 diffuse = diff * light_atten_coff * color;
    
      vec3 viewDir = normalize(cameraPos - vs_position);
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(halfDir, normal), 0.0), 32.0);
      vec3 specular = Ks * light_atten_coff * spec;

      vec3 radiance = (ambient + diffuse + specular);
      vec3 phongColor = pow(radiance, vec3(1.0 / 2.2));
      return phongColor;
    }

    void main() {
      vec3 shadowCoord = vs_shadowCoord.xyz / vs_shadowCoord.w * 0.5 + 0.5;
      float occluder = texture(shadowMap, shadowCoord.xy).r;
      float receiver = c * shadowCoord.z;
      float visibility = clamp(exp(occluder - receiver), 0.0, 1.0);
      FragColor = vec4(blinnPhong() * visibility, 1.0);
    }`
  }
}