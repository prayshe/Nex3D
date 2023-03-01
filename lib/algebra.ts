export type Mat4 = [number, number, number, number,
                    number, number, number, number,
                    number, number, number, number,
                    number, number, number, number]
                    
export type Vec4 = [number, number, number, number]

export type Vec3 = [number, number, number]

export function getIdentity(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
}

export function multiply(left: Mat4, right: Mat4): Mat4 {
  return [
    left[0x0] * right[0x0] + left[0x4] * right[0x1] + left[0x8] * right[0x2] + left[0xc] * right[0x3],
    left[0x1] * right[0x0] + left[0x5] * right[0x1] + left[0x9] * right[0x2] + left[0xd] * right[0x3],
    left[0x2] * right[0x0] + left[0x6] * right[0x1] + left[0xa] * right[0x2] + left[0xe] * right[0x3],
    left[0x3] * right[0x0] + left[0x7] * right[0x1] + left[0xb] * right[0x2] + left[0xf] * right[0x3],
    left[0x0] * right[0x4] + left[0x4] * right[0x5] + left[0x8] * right[0x6] + left[0xc] * right[0x7],
    left[0x1] * right[0x4] + left[0x5] * right[0x5] + left[0x9] * right[0x6] + left[0xd] * right[0x7],
    left[0x2] * right[0x4] + left[0x6] * right[0x5] + left[0xa] * right[0x6] + left[0xe] * right[0x7],
    left[0x3] * right[0x4] + left[0x7] * right[0x5] + left[0xb] * right[0x6] + left[0xf] * right[0x7],
    left[0x0] * right[0x8] + left[0x4] * right[0x9] + left[0x8] * right[0xa] + left[0xc] * right[0xb],
    left[0x1] * right[0x8] + left[0x5] * right[0x9] + left[0x9] * right[0xa] + left[0xd] * right[0xb],
    left[0x2] * right[0x8] + left[0x6] * right[0x9] + left[0xa] * right[0xa] + left[0xe] * right[0xb],
    left[0x3] * right[0x8] + left[0x7] * right[0x9] + left[0xb] * right[0xa] + left[0xf] * right[0xb],
    left[0x0] * right[0xc] + left[0x4] * right[0xd] + left[0x8] * right[0xe] + left[0xc] * right[0xf],
    left[0x1] * right[0xc] + left[0x5] * right[0xd] + left[0x9] * right[0xe] + left[0xd] * right[0xf],
    left[0x2] * right[0xc] + left[0x6] * right[0xd] + left[0xa] * right[0xe] + left[0xe] * right[0xf],
    left[0x3] * right[0xc] + left[0x7] * right[0xd] + left[0xb] * right[0xe] + left[0xf] * right[0xf],
  ]
}

export function invert(R: Mat4): Mat4 {
  const n = 4
  const m = 8
  const augmented: number[][] = []
  for (let i = 0; i < n; ++i) {
    augmented[i] = new Array(m).fill(0)
    for (let j = 0; j < n; ++j) {
      augmented[i][j] = R[j * n + i]
    }
    augmented[i][i + n] = 1.0
  }
  for (let i = 0; i < n; ++i) {
    let pivot = i
    for (let j = i + 1; j < n; ++j) {
      if (Math.abs(augmented[j][i]) > Math.abs(augmented[pivot][i])) {
        pivot = j
      }
    }
    if (Math.abs(augmented[pivot][i]) < Number.EPSILON) continue
    if (pivot != i) {
      for (let j = i; j < m; ++j) {
        const t = augmented[i][j]
        augmented[i][j] = augmented[pivot][j]
        augmented[pivot][j] = t
      }
    }
    for (let j = i + 1; j < m; ++j) {
      augmented[i][j] /= augmented[i][i]
    }
    for (let j = 0; j < n; ++j) {
      if (j == i) continue
      for (let k = i + 1; k < m; ++k) {
        augmented[j][k] -= augmented[i][k] * augmented[j][i]
      }
    }
  }
  return [
    augmented[0][4], augmented[1][4], augmented[2][4], augmented[3][4],
    augmented[0][5], augmented[1][5], augmented[2][5], augmented[3][5],
    augmented[0][6], augmented[1][6], augmented[2][6], augmented[3][6],
    augmented[0][7], augmented[1][7], augmented[2][7], augmented[3][7]
  ]
}

export function apply(R: Mat4, v: Vec4): Vec4 {
  return [
    R[0] * v[0] + R[4] * v[1] + R[0x08] * v[2] + R[12] * v[3],
    R[1] * v[0] + R[5] * v[1] + R[0x09] * v[2] + R[13] * v[3],
    R[2] * v[0] + R[6] * v[1] + R[0x0a] * v[2] + R[14] * v[3],
    R[3] * v[0] + R[7] * v[1] + R[0x0b] * v[2] + R[15] * v[3]
  ]
}

export function zoom(scale: Vec3): Mat4 {
  return [
    scale[0], 0, 0, 0,
    0, scale[1], 0, 0,
    0, 0, scale[2], 0,
    0, 0, 0, 1
  ]
}

export function rotate(rotation: Vec4): Mat4 {
  const x2 = rotation[0] + rotation[0]
  const y2 = rotation[1] + rotation[1]
  const z2 = rotation[2] + rotation[2]

  const xx2 = x2 * rotation[0]
  const xy2 = x2 * rotation[1]
  const xz2 = x2 * rotation[2]
  const xw2 = x2 * rotation[3]

  const yy2 = y2 * rotation[1]
  const yz2 = y2 * rotation[2]
  const yw2 = y2 * rotation[3]

  const zz2 = z2 * rotation[2]
  const zw2 = z2 * rotation[3]

  return [
    1 - yy2 - zz2, xy2 + zw2, xz2 - yw2, 0,
    xy2 - zw2, 1 - xx2 - zz2, yz2 + xw2, 0,
    xz2 + yw2, yz2 - xw2, 1 - xx2 - yy2, 0,
    0, 0, 0, 1
  ]
}

export function translate(translation: Vec3): Mat4 {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    translation[0], translation[1], translation[2], 1
  ]
}

export function compose(scale: Vec3, rotation: Vec4, translation: Vec3): Mat4 {
  const x2 = rotation[0] + rotation[0]
  const y2 = rotation[1] + rotation[1]
  const z2 = rotation[2] + rotation[2]

  const xx2 = x2 * rotation[0]
  const xy2 = x2 * rotation[1]
  const xz2 = x2 * rotation[2]
  const xw2 = x2 * rotation[3]

  const yy2 = y2 * rotation[1]
  const yz2 = y2 * rotation[2]
  const yw2 = y2 * rotation[3]

  const zz2 = z2 * rotation[2]
  const zw2 = z2 * rotation[3]

  return [
    (1 - yy2 - zz2) * scale[0], (xy2 + zw2) * scale[0], (xz2 - yw2) * scale[0], 0,
    (xy2 - zw2) * scale[1], (1 - xx2 - zz2) * scale[1], (yz2 + xw2) * scale[1], 0,
    (xz2 + yw2) * scale[2], (yz2 - xw2) * scale[2], (1 - xx2 - yy2) * scale[2], 0,
    translation[0], translation[1], translation[2], 1
  ]
}

export function rotateAroundAxisAngle(axis: Vec3, radian: number) {
  const half = radian / 2
  const halfSin = Math.sin(half)
  const halfCos = Math.cos(half)
  const quaternion = [...times(normalize(axis), halfSin), halfCos] as Vec4
  return rotate(quaternion)
}

export function normalize(a: number[]) {
  const len = Math.sqrt(a.reduce((sum, i) => sum + i * i, 0))
  return a.map(i => i / len)
}

export function plus(a: number[], b: number[]) {
  return a.map((v, i) => v + b[i])
}

export function minus(a: number[], b: number[]) {
  return a.map((v, i) => v - b[i])
}

export function times(a: number[], b: number) {
  return a.map(i => i * b)
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [ a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0] ]
}

export function dot(a: number[], b: number[]) {
  return a.reduce((sum, i, j) => sum + i * b[j], 0)
}

export function orthogonal(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
  return [
    2 / (right - left), 0, 0, 0,
    0, 2 / (top - bottom), 0, 0,
    0, 0, 2 / (near - far), 0,
    -(right + left) / (right - left), -(top + bottom) / (top - bottom), (far + near) / (near - far), 1
  ]
}

export function perspective(fov: number, near: number, far: number, aspect: number): Mat4 {
  const f = 1.0 / Math.tan(fov * Math.PI / 360.0)
  const depthInv = 1.0 / (near - far)
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * depthInv, -1,
    0, 0, near * far * depthInv * 2, 0
  ]
}

export function lookAt(position: Vec3, target: Vec3, up: Vec3): Mat4 {
  const gaze = normalize(minus(position, target)) as Vec3
  const right = normalize(cross(up, gaze)) as Vec3
  up = cross(gaze, right)
  return [
    right[0], up[0], gaze[0], 0,
    right[1], up[1], gaze[1], 0,
    right[2], up[2], gaze[2], 0,
    -dot(right, position), -dot(up, position), -dot(gaze, position), 1
  ]
}

export function lerp(previous: number[], next: number[], interpolation: number) {
  return next.map((value, index) => {
    return previous[index] + interpolation * (value - previous[index])
  })
}

export function slerp(previous: number[], next: number[], interpolation: number) {
  let d = dot(previous, next)
  if (d < 0.0) {
    next = next.map(n => { return -n })
    d = -d
  }
  if (d > 0.9995) {
    return normalize(lerp(previous, next, interpolation))
  }
  const alpha = Math.acos(d)
  const beta = interpolation * alpha
  const sinAlpha = Math.sin(alpha)
  const sinBeta = Math.sin(beta)
  const scaleNextQuat = sinBeta / sinAlpha
  const scalePreviousQuat = Math.cos(beta) - d * scaleNextQuat
  return next.map((value, index) => scalePreviousQuat * previous[index] + scaleNextQuat * value)
}
