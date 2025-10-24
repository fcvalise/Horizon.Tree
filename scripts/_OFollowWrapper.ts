import * as hz from 'horizon/core';
import { OFollow } from '_OFollow';
import { OWings } from '_OWings';
import { OWrapper } from '_OWrapper';

class OFollowWrapper extends hz.Component<typeof OFollowWrapper> {
  start() {
    const wrapper = new OWrapper(this);
    OFollow.Create(wrapper, this.entity);
    OWings.Create(wrapper, this.entity);
  }
}
hz.Component.register(OFollowWrapper);