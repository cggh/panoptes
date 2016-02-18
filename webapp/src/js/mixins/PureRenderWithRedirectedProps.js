import Immutable from 'immutable';
import _omit from 'lodash/omit';
import {shallowEqualImmutable} from 'react-immutable-render-mixin';

let PureRenderWithRedirectedProps = function({check, redirect}) {
  return {
    componentWillMount() {
      //We need to redirect these so we always use the latest as
      //render might not have been called as componentUpdate does not check them
      if (redirect)
        redirect.forEach((prop) => this[prop] =
          (function() { return this.props[prop].apply(this, arguments); }).bind(this)
        );
    },

    //As component update is an anon func, it looks different on every prop change,
    //so skip it when checking
    shouldComponentUpdate(nextProps, nextState) {
      let propsChanged = true;
      if (check)
        propsChanged = check.some((name) => !Immutable.is(this.props[name], nextProps[name]));
      else
        propsChanged = !shallowEqualImmutable(
          _omit(this.props, redirect || []),
          _omit(nextProps, redirect || [])
        );
      return propsChanged || !shallowEqualImmutable(this.state, nextState);
    }
  };
};

module.exports = PureRenderWithRedirectedProps;
