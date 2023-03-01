import { compose, getIdentity, Mat4, multiply } from "./algebra"
import { BufferData, Mesh, Model, Primitive } from "./model"

const ELEMENT_SIZE = { 'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16 }
const COMPONENT_TYPE = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }

export class GLTFLoader {
  constructor(private readonly gl: WebGL2RenderingContext) {}

  async load(uri: any) {
    console.log(uri)
    const buffer = await fetch(uri).then(response => response.arrayBuffer())
    const [magic, version, length] = new Uint32Array(buffer.slice(0, 12))
    if (magic != 1179937895 || version != 2) {
      console.log("Invalid glb")
    }
    const [gltfLength, gltfType] = new Uint32Array(buffer.slice(12, 20))
    if (gltfType != 1313821514) {
      console.log("Invalid glTF chunk")
    }
    const gltf = JSON.parse(new TextDecoder("utf-8").decode(buffer.slice(20, 20 + gltfLength)))
    console.log(gltf)
    const [binLength, binType] = new Uint32Array(buffer.slice(20 + gltfLength, 28 + gltfLength))
    if (binType != 5130562) {
      console.log("Invalid bin chunk")
    }
    if (gltfLength + binLength + 28 != length) {
      console.log("Invalid length")
    }
    const bin = buffer.slice(28 + gltfLength)
    const textures = new Array<WebGLTexture>()
    if (gltf.images !== undefined) {
      for (const image of gltf.images) {
        textures.push(await this.loadTexture(gltf, bin, image))
      }
    }
    const model = new Model()
    gltf.scenes[gltf.scene ?? 0].nodes.forEach(
      root => GLTFLoader.parseMeshes(gltf, bin, root, getIdentity(), textures, model.meshes))
    return model
  }

  static parseMeshes(
    gltf: any,
    bin: ArrayBuffer,
    nodeId: number,
    parentTransformation: Mat4,
    textures: WebGLTexture[],
    meshes: Mesh[]
  ) {
    const node = gltf.nodes[nodeId]
    const translation = node.translation || [0, 0, 0]
    const rotation = node.rotation || [0, 0, 0, 0]
    const scale = node.scale|| [1, 1, 1]
    const localTransformation = node.matrix !== undefined ? node.matrix : compose(scale, rotation, translation)
    const globalTransformation = multiply(parentTransformation, localTransformation)
    if (node.mesh !== undefined) {
      const primitives = GLTFLoader.parsePrimitives(gltf, bin, gltf.meshes[node.mesh].primitives, textures)
      meshes.push(new Mesh(primitives, globalTransformation))
    }
    if (node.children !== undefined) {
      node.children.forEach(child => GLTFLoader.parseMeshes(gltf, bin, child, globalTransformation, textures, meshes))
    }
  }

  static parsePrimitives(gltf: any, bin: ArrayBuffer, primitives: any[], textures: WebGLTexture[]) {
    return primitives.map(primitive => {
      const meshPrimitive = new Primitive()
      const attributes = primitive.attributes
      if (attributes.POSITION !== undefined) {
        const positions = GLTFLoader.access(gltf, bin, attributes.POSITION)
        meshPrimitive.setPositions(positions)
      }
      if (attributes.TEXCOORD_0 !== undefined) {
        const texcoords = GLTFLoader.access(gltf, bin, attributes.TEXCOORD_0)
        meshPrimitive.setTexCoords(texcoords)
      }
      if (attributes.NORMAL !== undefined) {
        const normals = GLTFLoader.access(gltf, bin, attributes.NORMAL)
        meshPrimitive.setNormals(normals)
      }
      if (primitive.indices !== undefined) {
        const indices = GLTFLoader.access(gltf, bin, primitive.indices)
        meshPrimitive.setIndices(indices)
      }
      let textureIndex = primitive.material !== undefined
          ? gltf.materials[primitive.material].pbrMetallicRoughness?.baseColorTexture?.index
          : undefined
      if (textureIndex == undefined) {
        textureIndex = gltf.materials[primitive.material].emissiveTexture?.index
      }
      if (textureIndex !== undefined) {
        meshPrimitive.setTexture(textures[textureIndex])
      }
      return meshPrimitive
    })
  }

  static access(gltf: any, bin: ArrayBuffer, accessorId: number) {
    const accessor = gltf.accessors[accessorId]
    const bufferView = gltf.bufferViews[accessor.bufferView]
    const elementSize = ELEMENT_SIZE[accessor.type]
    const typedArray = COMPONENT_TYPE[accessor.componentType]
    const unitLength = elementSize * typedArray.BYTES_PER_ELEMENT
    const byteStride = bufferView.byteStride || unitLength
    let byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0)
    const data = new typedArray(accessor.count * elementSize)
    for (let i = 0; i < data.length; i += elementSize) {
      const value = new typedArray(bin, byteOffset, elementSize)
      for (let j = 0; j < elementSize; ++j) {
        data[i + j] = value[j]
      }
      byteOffset += byteStride
    }
    return new BufferData(accessor.count, elementSize, accessor.componentType, accessor.normalized ?? false, data)
  }

  async loadTexture(gltf: any, bin: ArrayBuffer, image: any) {
    const tex = this.gl.createTexture()!
    this.gl.activeTexture(this.gl.TEXTURE0)
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex)
    const bufferView = gltf.bufferViews[image.bufferView]
    const imageBytes = new Uint8Array(bin, bufferView.byteOffset ?? 0, bufferView.byteLength)
    const blob = new Blob([ imageBytes ], { type: image.mimeType })
    const urlCreator = window.URL || window.webkitURL
    const img = new Image()
    img.src = urlCreator.createObjectURL(blob)
    await img.decode()
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img)
    this.gl.generateMipmap(this.gl.TEXTURE_2D)
    this.gl.bindTexture(this.gl.TEXTURE_2D, null)
    return tex
  }
}

export class BasicLoader {
  static loadCube() {
    const primitive = new Primitive()
    primitive.setPositions(
      new BufferData(
        24,
        3,
        WebGL2RenderingContext.FLOAT,
        false,
        new Float32Array([
          -1.0, -1.0, 1.0,
          1.0, -1.0, 1.0,
          1.0, 1.0, 1.0,
          -1.0, 1.0, 1.0,
  
          -1.0, -1.0, -1.0,
          -1.0, 1.0, -1.0,
          1.0, 1.0, -1.0,
          1.0, -1.0, -1.0,
  
          -1.0, 1.0, -1.0,
          -1.0, 1.0, 1.0,
          1.0, 1.0, 1.0,
          1.0, 1.0, -1.0,
  
          -1.0, -1.0, -1.0,
          1.0, -1.0, -1.0,
          1.0, -1.0, 1.0,
          -1.0, -1.0, 1.0,
  
          1.0, -1.0, -1.0,
          1.0, 1.0, -1.0,
          1.0, 1.0, 1.0,
          1.0, -1.0, 1.0,
  
          -1.0, -1.0, -1.0,
          -1.0, -1.0, 1.0,
          -1.0, 1.0, 1.0,
          -1.0, 1.0, -1.0,
        ])))
    .setIndices(new BufferData(
      36,
      1,
      WebGL2RenderingContext.UNSIGNED_INT,
      false,
      new Uint32Array([
        0, 1, 2, 0, 2, 3,
        4, 5, 6, 4, 6, 7,
        8, 9, 10, 8, 10, 11,
        12, 13, 14, 12, 14, 15,
        16, 17, 18, 16, 18, 19,
        20, 21, 22, 20, 22, 23,
      ])))
    return new Model([new Mesh([primitive])])
  }

  static loadPlane(gl: WebGL2RenderingContext) {
    const texture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
      1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([200, 200, 200, 255]));
    const primitive = new Primitive()
    primitive.setPositions(
      new BufferData(
        4,
        3,
        WebGL2RenderingContext.FLOAT,
        false,
        new Float32Array([
          -1.0, 0.0, 1.0,
          1.0, 0.0, 1.0,
          1.0, 0.0, -1.0,
          -1.0, 0.0, -1.0,
        ])))
    .setNormals(new BufferData(
        6,
        3,
        WebGL2RenderingContext.FLOAT,
        false,
        new Float32Array([
          0.0, 1.0, 0.0,
          0.0, 1.0, 0.0,
          0.0, 1.0, 0.0,
          0.0, 1.0, 0.0,
          0.0, 1.0, 0.0,
          0.0, 1.0, 0.0
        ])))
    .setTexCoords(new BufferData(
      4,
      2,
      WebGL2RenderingContext.FLOAT,
      false,
      new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0
      ])))
    .setTexture(texture)
    .setIndices(new BufferData(
      6,
      1,
      WebGL2RenderingContext.UNSIGNED_INT,
      false,
      new Uint32Array([
        0, 1, 2, 0, 2, 3,
      ])))
    return new Model([new Mesh([primitive])])
  }

  static loadQuad(gl: WebGL2RenderingContext) {
    const primitive = new Primitive()
    primitive.setPositions(
      new BufferData(
        4,
        2,
        WebGL2RenderingContext.FLOAT,
        false,
        new Float32Array([
          -1.0, -1.0,
          1.0, -1.0,
          1.0, 1.0,
          -1.0, 1.0
        ])))
    .setTexCoords(new BufferData(
          4,
          2,
          WebGL2RenderingContext.FLOAT,
          false,
          new Float32Array([
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
          ])))
    .setIndices(new BufferData(
      6,
      1,
      WebGL2RenderingContext.UNSIGNED_INT,
      false,
      new Uint32Array([
        0, 1, 2, 0, 2, 3,
      ])))
    return primitive
  }
}
