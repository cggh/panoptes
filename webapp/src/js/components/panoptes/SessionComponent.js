import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import deserialiseComponent from 'util/deserialiseComponent';
import ErrorBoundary from 'components/ErrorBoundary';
// Mixins
import FluxMixin from 'mixins/FluxMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

let SessionComponent = createReactClass({
  displayName: 'SessionComponent',

  mixins: [
    FluxMixin,
    StoreWatchMixin('SessionStore')
  ],

  propTypes: {
    compId: PropTypes.string,
    updateTitleIcon: PropTypes.func,
    replaceable: PropTypes.bool
  },

  shouldComponentUpdate(nextProps, nextState) {
    return (nextProps.compId !== this.props.compId) ||
      (nextState.component !== this.state.component);
  },

  getDefaultProps() {
    return {
      updateTitleIcon: () => null
    };
  },

  componentWillMount() {
    //Store this so that we can access changes without render.
    this.updateTitleIcon =
      (function () {
        return this.props.updateTitleIcon.apply(this, arguments);
      }).bind(this);
  },

  getStateFromFlux(props) {
    props = props || this.props;
    return {
      component: this.getFlux().store('SessionStore').getState().getIn(['components', props.compId])
    };
  },

  title() {
    return this.state.component.getIn(['props', 'title']) || this.refs.child.title ? this.refs.child.title() : null || '';
  },

  icon() {
    return this.state.component.getIn(['props', 'icon']) || this.refs.child.icon ? this.refs.child.icon() : null || '';
  },

  componentWillReceiveProps(nextProps) {
    this.setState(this.getStateFromFlux(nextProps));
  },

  componentDidUpdate(prevProps, prevState) {
    if (this.props.updateTitleIcon && (!prevState.component || !this.state.component || (prevState.component.get('type') !== this.state.component.get('type')))) {
      this.props.updateTitleIcon();
    }
  },

  render() {
    const {compId, replaceable} = this.props;
    const {component} = this.state;
    let actions = this.getFlux().actions.session;

    return <ErrorBoundary>
      {component ? React.cloneElement(deserialiseComponent(component, [compId], {
          setProps: actions.componentSetProps,
          replaceSelf: actions.componentReplace,
          updateTitleIcon: this.updateTitleIcon
        }), {ref: 'child', replaceable})
        : <span>Component does not exist</span>}
    </ErrorBoundary>;
  }
});

export default SessionComponent;
