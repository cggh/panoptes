import React from  'react';
import deserialiseComponent from 'util/deserialiseComponent';
// Mixins
import FluxMixin from 'mixins/FluxMixin';
import PureRenderMixin from 'mixins/PureRenderMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

let SessionComponent = React.createClass({
  mixins: [
    FluxMixin,
    PureRenderMixin,
    StoreWatchMixin('SessionStore')],

  propTypes: {
    compId: React.PropTypes.string,
    updateTitleIcon: React.PropTypes.func
  },

  getStateFromFlux(props) {
    props = props || this.props;
    return {
      component: this.getFlux().store('SessionStore').getState().getIn(['components', props.compId])
    };
  },

  title() {
    return this.state.component.getIn(['props', 'title']) || this.refs.child.title()
  },

  icon() {
    return this.state.component.getIn(['props', 'icon']) || this.refs.child.icon()
  },

  componentWillReceiveProps(nextProps) {
    this.setState(this.getStateFromFlux(nextProps));
  },

  componentDidUpdate(prevProps, prevState) {
    if (this.props.updateTitleIcon && (prevState.component.get('type') !== this.state.component.get('type'))) {
      this.props.updateTitleIcon()
    }
  },

  render() {
    const {compId} = this.props;
    const {component} = this.state;
    let actions = this.getFlux().actions.session;
    return React.cloneElement(deserialiseComponent(component, [compId], {
      setProps: actions.componentSetProps,
      replaceSelf: actions.componentReplace,
      updateTitleIcon: this.props.updateTitleIcon
    }), {ref: 'child'});
  }
});

export default SessionComponent;
