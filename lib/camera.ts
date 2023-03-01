import { apply, cross, lookAt, Mat4, minus, multiply, normalize, orthogonal, perspective, plus, rotate, rotateAroundAxisAngle, times, Vec3, Vec4 } from "./algebra"

export class Camera {
  setFov(fov: number) {
    this.fov = fov
    this.dirty = true
    return this
  }

  setNear(near: number) {
    this.near = near
    this.dirty = true
    return this
  }

  setFar(far: number) {
    this.far = far
    this.dirty = true
    return this
  }

  setAspect(aspect: number) {
    this.aspect = aspect
    this.dirty = true
    return this
  }

  setPosition(position: Vec3) {
    this.position = position
    this.dirty = true
    return this
  }

  setTarget(target: Vec3) {
    this.target = target
    this.dirty = true
    return this
  }

  setUp(up: Vec3) {
    this.up = up
    this.dirty = true
    return this
  }

  getMatrix(): Mat4 {
    if (this.dirty) {
      this.dirty = false
      this.matrix = multiply(
        perspective(this.fov, this.near, this.far, this.aspect),
        lookAt(this.position, this.target, this.up))
    }
    return this.matrix
  }

  getQuaterinion(radian: number, axis: Vec3) {
    const half = radian / 2
    const halfSin = Math.sin(half)
    const halfCos = Math.cos(half)
    const quaternion = [...times(axis, halfSin), halfCos] as Vec4
    return rotate(quaternion)
  }

  orbit(radianX: number, radianY: number) {
    const zAxis = minus(this.position, this.target) as Vec3
    const xAxis = cross(this.up, zAxis) as Vec3
    const yAxis = cross(zAxis, xAxis) as Vec3
    const xRotation = rotateAroundAxisAngle(xAxis, radianX)
    const yRotation = rotateAroundAxisAngle(yAxis, radianY)
    const rotation = multiply(xRotation, yRotation)
    const position = apply(rotation, [...this.position, 1])
    this.setPosition([position[0], position[1], position[2]])
  }

  setController(canvas: HTMLCanvasElement) {
    let leftPressed = false
    canvas.addEventListener('mousedown', (event) => {
      leftPressed = true
    })
    canvas.addEventListener('mouseup', (event) => {
      leftPressed = false
    })
    canvas.addEventListener('mousemove', (event) => {
      if (leftPressed) {
        const radianX = -event.movementY / canvas.height * Math.PI
        const radianY = -event.movementX / canvas.width * Math.PI
        this.orbit(radianX, radianY)
      }
    })
    const initialDistance = Math.sqrt((minus(this.position, this.target).reduce((sum, i) => sum + i * i)))
    const minDistance = initialDistance / 10
    canvas.addEventListener('wheel', (event) => {
      const factor = event.deltaY / canvas.height + 1
      const direction = minus(this.position, this.target)
      const position = plus(this.target, times(direction, factor)) as Vec3
      const distance = Math.sqrt(direction.reduce((sum, i) => sum + i * i)) * factor
      if (distance >= minDistance) {
        this.setPosition(position)
      }
    })
    return this
  }

  fov= 45
  near= 0.01
  far = 10000
  aspect = 1
  position: Vec3 = [0, 0, 10]
  target: Vec3 = [0, 0, 0]
  up: Vec3 = [0, 1, 0]
  matrix: Mat4
  dirty = true
}