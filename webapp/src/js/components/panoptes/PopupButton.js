import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import Icon from 'ui/Icon';
import RaisedButton from 'material-ui/RaisedButton';

const componentTranslation = {
  ItemMap: 'containers/MapWithActions',
  Tree: 'containers/TreeWithActions',
  Plot: 'containers/PlotWithActions'
}

let PopupButton = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
  ],

  propTypes: {
    //Use either component or componentPath
    component: React.PropTypes.string,
    componentPath: React.PropTypes.string,
    label: React.PropTypes.string,
    icon: React.PropTypes.string,
    //Optional - if not specified will launch new popup instead of replacing
    componentUpdate: React.PropTypes.func
    //rest of proptypes depend on component
  },

  handleClick(e) {
    const {label, icon, component,  componentPath, componentUpdate, ...others} = this.props;
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    if (middleClick || !componentUpdate) {
      let switchTo = true;
      this.getFlux().actions.session.popupOpen(componentTranslation[component] || componentPath, others, switchTo);
    } else {
      this.props.componentUpdate(others, componentTranslation[component] || componentPath);
    }
  },

  render() {
    const {label, icon, component, componentPath} = this.props;

    if (!componentTranslation.hasOwnProperty(component) && !componentPath) {
      console.error(`${component} is not a valid component name (from PopupButton)`);
    }
    return <RaisedButton
      style={{margin: '7px', color: 'white'}}
      label={label}
      primary={true}
      icon={icon ? <Icon inverse={true} name={icon} /> : null}
      labelStyle={{textTransform: 'inherit'}}
      onClick={this.handleClick}
    />;
  }

});

export default PopupButton;
