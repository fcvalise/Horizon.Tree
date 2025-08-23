import { TreeArchitecture } from '_TreeArchitecture';
import { TreeBase } from '_TreeBase';
import * as hz from 'horizon/core';

class TreeComponent extends hz.Component<typeof TreeComponent> {
  static propsDefinition = {
    seed: { type: hz.PropTypes.String },
  };

  private tree!: TreeBase;

  start() {
    this.tree = new TreeBase(this, this.entity.position.get(), {seed: this.props.seed});
  }
}
hz.Component.register(TreeComponent);