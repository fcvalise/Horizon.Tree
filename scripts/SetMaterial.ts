import * as hz from 'horizon/core';

class SetMaterial extends hz.Component<typeof SetMaterial> {
  static propsDefinition = {
    id: { type: hz.PropTypes.Number },
  };

  start() {
    this.entity.as(hz.MeshEntity).setMaterial(new hz.MaterialAsset(BigInt(this.props.id)));
  }
}
hz.Component.register(SetMaterial);