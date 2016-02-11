import Immutable from 'immutable';
import { shallowEqualImmutable } from 'react-immutable-render-mixin';

let PureRenderWithComponentUpdateException = function(propsToCheck) {
  return {
    //As component update is an anon func, it looks different on every prop change,
    //so skip it when checking
    shouldComponentUpdate(nextProps, nextState) {
      let propsChanged = true;
      if (propsToCheck)
        propsChanged = [propsToCheck].some((name) => !Immuatable.is(this.props[name], nextProps[name]);
      else
        propsChanged = !shallowEqualImmutable(
          Object.assign({}, this.props, {componentUpdate: false}),
          Object.assign({}, nextProps, {componentUpdate: false})
        );
      return propsChanged || !shallowEqualImmutable(this.state, nextState);
    },

    //Then we need to redirect componentUpdate so we always use the latest as
    //render might not have been called if only componentUpdate changed
    componentUpdate() {
      this.props.componentUpdate.apply(this, arguments);
    }
  };
};

module.exports = PureRenderWithComponentUpdateException;
