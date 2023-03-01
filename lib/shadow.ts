import { Mat4 } from "./algebra"
import { BufferData, Model, Primitive } from "./model"
import { Shader, ShaderSourceProvider } from "./shader"

export default class Shadow {
  constructor(gl: WebGL2RenderingContext) {
    gl.getExtension("EXT_color_buffer_float")
    gl.getExtension("OES_texture_float_linear")
    this.kernelSize = 5
    this.textureSize = 2048
    this.depthShader = new Shader(gl, new DepthShaderSource)
    this.blurShader = new Shader(gl, new BlurShaderSource)
    this.kernel = Shadow.getKernel(this.kernelSize)
    this.depthFBO = gl.createFramebuffer()
    this.verticalFBO = gl.createFramebuffer()
    this.horizontalFBO = gl.createFramebuffer()
    this.depthTexture = this.initColorTexture(gl)
    this.verticalTexture = this.initColorTexture(gl)
    this.horizontalTexture = this.initColorTexture(gl)
    this.quad = Shadow.getQuad(gl)
    this.bindDepthTexture(gl, this.depthFBO, this.depthTexture)
    this.bindColorTexture(gl, this.verticalFBO, this.verticalTexture)
    this.bindColorTexture(gl, this.horizontalFBO, this.horizontalTexture)
  }

  initColorTexture(gl: WebGL2RenderingContext) {
    const texture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.textureSize,
      this.textureSize, 0, gl.RED, gl.FLOAT, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindTexture(gl.TEXTURE_2D, null)
    return texture
  }

  bindDepthTexture(gl: WebGL2RenderingContext, fbo: WebGLFramebuffer, texture: WebGLTexture) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    const depthBuffer = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT32F, this.textureSize, this.textureSize)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`WebGL failed at setting framebuffer ${status}`)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindRenderbuffer(gl.RENDERBUFFER, null)
  }

  bindColorTexture(gl: WebGL2RenderingContext, fbo: WebGLFramebuffer, texture: WebGLTexture) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`WebGL failed at setting framebuffer ${status}`)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  static getQuad(gl: WebGL2RenderingContext) {
    const quad = new Primitive()
    quad.setPositions(new BufferData(4, 2, gl.FLOAT, false, new Float32Array([
      -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0
    ])))
    quad.setTexCoords(new BufferData(4, 2, gl.FLOAT, false, new Float32Array([
      0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0
    ])))
    quad.setIndices(new BufferData(6, 1, gl.UNSIGNED_INT, false, new Uint32Array([
      0, 1, 2, 0, 2, 3
    ])))
    return quad
  } 

  static getKernel(kernelSize) {
    const halfSize = Math.floor(kernelSize / 2)
    const kernel = new Float32Array(halfSize + 1)
    const sigma = ((kernelSize - 1) * 0.5 - 1) * 0.3 + 0.8
    const negSigmaSquare2 = -2 * sigma * sigma
    kernel[0] = 1
    let sum = 1
    for (let i = 1; i <= halfSize; ++i) {
      kernel[i] = Math.exp(i * i / negSigmaSquare2)
      sum += kernel[i] + kernel[i]
    }
    for (let i = 0; i <= halfSize; ++i) {
      kernel[i] /= sum
    }
    return kernel
  }

  cast(gl: WebGL2RenderingContext, caster: Model[], ortho: Mat4, c: number) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthFBO)
    gl.viewport(0, 0, this.textureSize, this.textureSize)
    gl.enable(gl.DEPTH_TEST)
    gl.clearDepth(1.0)
    gl.clearBufferfv(gl.COLOR, 0, new Float32Array([c, 0, 0, 0]))
    gl.clear(gl.DEPTH_BUFFER_BIT)
    this.depthShader.use()
    this.depthShader.setMatrix("camera", ortho)
    this.depthShader.setFloat("c", c)
    this.depthShader.draw(caster)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture)
    gl.generateMipmap(gl.TEXTURE_2D)
    return this.blur(gl, c)
  }

  blur(gl: WebGL2RenderingContext, c: number) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.verticalFBO)
    gl.viewport(0, 0, this.textureSize, this.textureSize)
    gl.disable(gl.DEPTH_TEST)
    this.blurShader.use()
    this.blurShader.setInt("shadowMap", 0)
    this.blurShader.setInt("kernelSize", this.kernelSize)
    this.blurShader.setFloats("kernel", this.kernel)
    this.quad.setTexture(this.depthTexture)
    this.quad.draw(gl)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindTexture(gl.TEXTURE_2D, this.verticalTexture)
    gl.generateMipmap(gl.TEXTURE_2D)
    return this.verticalTexture
    /*
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.horizontalFBO)
    this.blurShader.setInt("vertical", 0)
    this.quad.setTexture(this.verticalTexture)
    this.quad.draw(gl)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    return this.horizontalTexture
    */
  }
  
  depthShader: Shader
  blurShader: Shader
  quad: Primitive
  
  depthFBO: WebGLFramebuffer
  verticalFBO: WebGLFramebuffer
  horizontalFBO: WebGLFramebuffer
  
  depthTexture: WebGLTexture
  verticalTexture: WebGLTexture
  horizontalTexture: WebGLTexture

  textureSize: number
  kernelSize: number
  kernel: Float32Array
}

class DepthShaderSource implements ShaderSourceProvider {
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
    uniform float c;
    out vec4 FragColor;
    void main() {
      FragColor.r = c * gl_FragCoord.z;
    }`
  }
}

class BlurShaderSource implements ShaderSourceProvider {
  getVertexSource() {
    return `#version 300 es
    layout(location = 0) in vec2 position;
    layout(location = 1) in vec2 texCoord;
    out vec2 vs_texCoord;
    void main() {
      vs_texCoord = texCoord;
      gl_Position = vec4(position, 0.0, 1.0);
    }`
  }
  getFragementSource() {
    return `#version 300 es
    precision highp float;

    #define MAX_KERNEL_SIZE 25

    uniform sampler2D shadowMap;
    uniform bool vertical;
    uniform int kernelSize;
    uniform float kernel[MAX_KERNEL_SIZE];

    in vec2 vs_texCoord;
    out vec4 FragColor;

    float box() {
      float d0 = texture(shadowMap, vs_texCoord).r;
      ivec2 texSize = textureSize(shadowMap, 0);
      vec2 step = 1.0 / vec2(float(texSize.x), float(texSize.y));
      int halfSize = kernelSize / 2;
      float sum = 0.0;
      for (int i = -halfSize; i <= halfSize; ++i) {
        float dx = float(i) * step.x;
        for (int j = -halfSize; j <= halfSize; ++j) {
          float dy = float(j) * step.y;
          float dk = texture(shadowMap, vs_texCoord + vec2(dx, dy)).r;
          sum += exp(dk - d0);
        }
      }
      return d0 + log(sum / float(kernelSize * kernelSize));
    }

    float gaussian() {
      float d0 = texture(shadowMap, vs_texCoord).r;
      ivec2 texSize = textureSize(shadowMap, 0);
      vec2 step = 1.0 / vec2(float(texSize.x), float(texSize.y));
      int halfSize = kernelSize / 2;
      float sum = 0.0;
      for (int i = -halfSize; i <= halfSize; ++i) {
        float dx = float(i) * step.x;
        for (int j = -halfSize; j <= halfSize; ++j) {
          float dy = float(j) * step.y;
          float dk = texture(shadowMap, vs_texCoord + vec2(dx, dy)).r;
          sum += kernel[abs(i)] * kernel[abs(j)] * exp(dk - d0);
        }
      }
      return d0 + log(sum);
    }

    void main() {
      FragColor.r = gaussian();
    }`
  }
}
