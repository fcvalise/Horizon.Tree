import { OFollow } from '_OFollow';
import { OWings } from '_OWings';
import { OWrapper } from '_OWrapper';
import * as hz from 'horizon/core';

class OFollowWrapper extends hz.Component<typeof OFollowWrapper> {
  static propsDefinition = {};

  start() {
    const wrapper = new OWrapper(this);
    OFollow.Create(wrapper, this.entity);
    OWings.Create(wrapper, this.entity);
  }
}
hz.Component.register(OFollowWrapper);