import { compose, lookAt, multiply, normalize, orthogonal, plus, rotate, rotateAroundAxisAngle, times, translate, Vec3, zoom } from "../lib/algebra"
import { Camera } from "../lib/camera"
import { Light } from "../lib/light"
import { BasicLoader, GLTFLoader } from "../lib/loader"
import { ColorShader, Shader, ShadowShader } from "../lib/shader"
import Shadow from "../lib/shadow"

async function Main(canvasId) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement
  const gl = canvas.getContext("webgl2") as WebGL2RenderingContext
  const lightShader = new Shader(gl, new ColorShader)
  const shadowShader = new Shader(gl, new ShadowShader)

  canvas.height = canvas.clientHeight
  canvas.width = canvas.clientWidth
  
  const loader = new GLTFLoader(gl)
  const floor = BasicLoader.loadPlane(gl)
  const fox = await loader.load("../assets/fox.glb")
  floor.matrix = zoom([20, 20, 20])
  fox.matrix = zoom([15, 15, 15])
  const models = [floor, fox]

  const light = new Light(100, [1, 1, 1], [-5, 30, 10])

  const camera = new Camera()
    .setAspect(canvas.width / canvas.height)
    .setPosition([35, 20, 20])
    .setTarget([0, 5, 0])
    .setUp([0, 1, 0])
    .setNear(0.1)
    .setFar(1000)
    .setController(canvas)

  function ortho() {
    const o = orthogonal(-200, 200, -200, 200, 1, 100)
    const l = lookAt(light.position, [0, 0, 0], [0, 1, 0])
    return multiply(o, l)
  }

  const shadow = new Shadow(gl)

  function renderFrame(timestamp: number) {
    const t = timestamp / 5000
    //light.setPosition([Math.sin(t * 6) * 10, 10, Math.cos(t * 6) * 10])
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    lightShader.use()
    lightShader.setMatrix("camera", camera.getMatrix())
    lightShader.setVector3("color", light.getColor())
    lightShader.draw([light.model])
    const c = 100
    const shadowMap = shadow.cast(gl, models, ortho(), c)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, shadowMap)
    shadowShader.use()
    shadowShader.setMatrix("camera", camera.getMatrix())
    shadowShader.setVector3("Ks", [0.7, 0.7, 0.7])
    shadowShader.setVector4("lightPos", [...light.position, 0])
    shadowShader.setVector3("cameraPos", camera.position)
    shadowShader.setVector3("lightIntensity", light.getColor())
    shadowShader.setMatrix("shadow", ortho())
    shadowShader.setInt("sampler", 0)
    shadowShader.setInt("shadowMap", 1)
    shadowShader.setFloat("c", c)
    shadowShader.draw(models)
    
    requestAnimationFrame(timestamp => renderFrame(timestamp))
  }

  requestAnimationFrame(timestamp => renderFrame(timestamp))
}

Main("canvas")