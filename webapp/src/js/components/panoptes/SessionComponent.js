import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import deserialiseComponent from 'util/deserialiseComponent';
import ErrorBoundary from 'components/ErrorBoundary';
// Mixins
import FluxMixin from 'mixins/FluxMixin';

let SessionComponent = createReactClass({
  displayName: 'SessionComponent',

  mixins: [
    FluxMixin,
  ],

  propTypes: {
    compId: PropTypes.string,
    updateTitleIcon: PropTypes.func,
    resetScroll: PropTypes.func,
    replaceable: PropTypes.bool
  },

  shouldComponentUpdate(nextProps) {
    let component = this.getFlux().store('SessionStore').getState().getIn(['components', nextProps.compId]);
    return component !== this.lastRendered;
  },

  getDefaultProps() {
    return {
      updateTitleIcon: () => null
    };
  },

  componentWillMount() {
    //Store this so that we can access changes without render.
    this.lastRendered = null;
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
    let component = this.getFlux().store('SessionStore').getState().getIn(['components', this.props.compId]);
    return component.getIn(['props', 'title']) || (this.refs.child && this.refs.child.title) ? this.refs.child.title() : null || '';
  },

  icon() {
    let component = this.getFlux().store('SessionStore').getState().getIn(['components', this.props.compId]);
    return component.getIn(['props', 'icon']) || (this.refs.child && this.refs.child.icon) ? this.refs.child.icon() : null || '';
  },

  componentDidUpdate(prevProps, prevState) {
    if (this.props.updateTitleIcon) {
      this.props.updateTitleIcon();
    }
  },

  render() {
    const {compId, replaceable, resetScroll} = this.props;
    let component = this.getFlux().store('SessionStore').getState().getIn(['components', compId]);
    this.lastRendered = component;
    let actions = this.getFlux().actions.session;
    return <ErrorBoundary>
      {component ? React.cloneElement(deserialiseComponent(component, [compId], {
          setProps: actions.componentSetProps,
          replaceSelf: actions.componentReplace,
          updateTitleIcon: this.updateTitleIcon,
          resetScroll
        }), {ref: 'child', replaceable})
        : <span>Component does not exist</span>}
    </ErrorBoundary>;
  }
});

export default SessionComponent;
