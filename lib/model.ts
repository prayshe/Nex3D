import { getIdentity, Mat4 } from "./algebra"

export class Model {
  constructor(
    public meshes = new Array<Mesh>(),
    public matrix = getIdentity()
  ) {}
}

export class Mesh {
  constructor(
    public primitives: Primitive[],
    public matrix = getIdentity()
  ) {}
}

export class Primitive {
  setPositions(bufferData: BufferData) {
    this.positions = bufferData
    const bbxmin = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
    const bbxmax = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
    for (let i = 0; i < bufferData.count; i += 3) {
      for (let j = 0; j < 3; ++j) {
        const v = bufferData.data[i + j]
        bbxmin[j] = Math.min(v, bbxmin[j])
        bbxmax[j] = Math.max(v, bbxmax[j])
      }
    }
    return this
  }

  setTexCoords(bufferData: BufferData) {
    this.texcoords = bufferData
    return this
  }

  setNormals(bufferData: BufferData) {
    this.normals = bufferData
    return this
  }

  setIndices(bufferData: BufferData) {
    this.indices = bufferData
    return this
  }

  setTexture(texture: WebGLTexture) {
    this.texture = texture
    return this
  }

  draw(gl: WebGL2RenderingContext) {
    if (this.vao === null) {
      this.enableVAO(gl)
    }
    gl.bindVertexArray(this.vao)
    if (this.texture !== null) {
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.texture)
    }
    if (this.indices !== null) {
      gl.drawElements(this.mode, this.indices.count, this.indices.type, 0)
    } else if (this.positions !== null) {
      gl.drawArrays(this.mode, 0, this.positions.count)
    }
  }

  private enableVAO(gl: WebGL2RenderingContext) {
    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)
    if (this.positions !== null) {
      this.enableAttribute(gl, 0, this.positions)
    }
    if (this.texcoords !== null) {
      this.enableAttribute(gl, 1, this.texcoords)
    }
    if (this.normals !== null) {
      this.enableAttribute(gl, 2, this.normals)
    }
    if (this.indices !== null) {
      this.enableIndices(gl, this.indices)
    }
  }

  private enableAttribute(gl: WebGL2RenderingContext, index: number, bufferData: BufferData) {
    const vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, bufferData.data, gl.STATIC_DRAW)
    gl.vertexAttribPointer(index, bufferData.size, bufferData.type, bufferData.normalized, 0, 0)
    gl.enableVertexAttribArray(index)
  }

  private enableIndices(gl: WebGL2RenderingContext, bufferData: BufferData) {
    const ebo = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, bufferData.data, gl.STATIC_DRAW)
  }

  private mode: number = WebGL2RenderingContext.TRIANGLES
  private vao: WebGLVertexArrayObject | null = null
  private positions: BufferData | null = null
  private texcoords: BufferData | null = null
  private texture: WebGLTexture | null = null
  private normals: BufferData | null = null
  private indices: BufferData | null = null
}

export class BufferData {
  constructor(
    public readonly count: number,
    public readonly size: number,
    public readonly type: number,
    public readonly normalized: boolean,
    public readonly data: any
  ) {}
}
