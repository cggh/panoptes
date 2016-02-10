import shallowEquals from 'shallow-equals';

let PureRenderWithComponentUpdateException = function(propsToCheck) {
  return {
    //As component update is an anon func, it looks different on every prop change,
    //so skip it when checking
    shouldComponentUpdate(nextProps, nextState) {
      let propsChanged = true;
      if (propsToCheck)
        propsChanged = [propsToCheck].some((name) => this.props[name] !== nextProps[name]);
      else
        propsChanged = !shallowEquals(
          Object.assign({}, this.props, {componentUpdate: false}),
          Object.assign({}, nextProps, {componentUpdate: false})
        );
      return propsChanged || !shallowEquals(this.state, nextState);
    },

    //Then we need to redirect componentUpdate so we always use the latest as
    //render might not have been called if only componentUpdate changed
    componentUpdate() {
      this.props.componentUpdate.apply(this, arguments);
    }
  };
};

module.exports = PureRenderWithComponentUpdateException;
