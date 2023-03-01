export class GL {
  static createLinear32FTexture(gl: WebGL2RenderingContext, textureSize: number) {
    gl.getExtension("OES_texture_float_linear")
    const texture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, textureSize, textureSize, 0, gl.RED, gl.FLOAT, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindTexture(gl.TEXTURE_2D, null)
    return texture
  }

  static createFBOWithTexture(gl: WebGL2RenderingContext, texture: WebGLTexture) {
    gl.getExtension("EXT_color_buffer_float")
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`WebGL failed at setting framebuffer ${status}`)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return fbo
  }

  static attachDepthBufferToFBO(gl: WebGL2RenderingContext, fbo: WebGLFramebuffer, textureSize: number) {
    const depthBuffer = gl.createRenderbuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT32F, textureSize, textureSize)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer)
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`WebGL failed at setting framebuffer ${status}`)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return fbo
  }
}