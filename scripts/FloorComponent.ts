import { Floor } from '_Floor';
import * as hz from 'horizon/core';

class FloorComponent extends hz.Component<typeof FloorComponent> {
  static propsDefinition = {};

  private floor!: Floor;

  start() {
    this.floor = new Floor(this, 20, 4);
  }
}
hz.Component.register(FloorComponent);