import { multiply, times, translate, Vec3, zoom } from "./algebra"
import { BasicLoader } from "./loader"
import { Model } from "./model"

export class Light{
  constructor(
    public intensity = 1,
    public color: Vec3 = [1, 1, 1],
    public position: Vec3 = [0, 0, 0]
  ) {
    this.model = BasicLoader.loadCube()
    this.model.matrix = multiply(translate(position), zoom([0.1, 0.1, 0.1]))
  }

  setPosition(position: Vec3) {
    this.position = position
    this.model.matrix = multiply(translate(position), zoom([0.1, 0.1, 0.1]))
    return this
  }

  getColor() {
    return times(this.color, this.intensity) as Vec3
  }

  model: Model
}