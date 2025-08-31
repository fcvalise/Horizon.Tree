import * as hz from 'horizon/core';
import { OWrapper } from '_OWrapper';
import { TreeBase } from '_TreeBase';

class TreeComponent extends hz.Component<typeof TreeComponent> {
  static propsDefinition = {
    seed: { type: hz.PropTypes.String },
  };

  private wrapper!: OWrapper;
  private tree!: TreeBase;

  start() {
    const position = this.entity.position.get();
    this.wrapper = new OWrapper(this);
    this.tree = new TreeBase(this.wrapper, position, { seed: this.props.seed });
  }
}
hz.Component.register(TreeComponent);