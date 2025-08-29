import * as hz from 'horizon/core';

class ChangeColor extends hz.Component<typeof ChangeColor> {
  static propsDefinition = {

  };

  start() {
    const children = this.entity.children.get();
    for (const child of children) {
      child.as(hz.MeshEntity).style.tintColor.set(new hz.Color(0.6, 0.6, 0.6));
      child.as(hz.MeshEntity).style.brightness.set(0.8);
    }
  }
}
hz.Component.register(ChangeColor);