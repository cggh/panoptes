import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import Icon from 'ui/Icon';
import RaisedButton from 'material-ui/RaisedButton';

// TODO: Deprecate ItemMap in favour of TableMap or Map

const componentTranslation = {
  ItemMap: 'Map/Table/Actions',
  Map: 'Map/Table/Actions',
  Tree: 'containers/TreeWithActions',
  Plot: 'containers/PlotWithActions',
  PivotTable: 'containers/PivotTableWithActions'
};

let PopupButton = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    //Use either component or componentPath
    component: React.PropTypes.string,
    componentPath: React.PropTypes.string,
    label: React.PropTypes.string,
    icon: React.PropTypes.string,
    //Optional - if not specified will launch new popup instead of replacing
    componentUpdate: React.PropTypes.func,
    openingMode: React.PropTypes.string,
    //rest of proptypes depend on component
  },

  handleClick(e) {
    const {component,  componentPath, componentUpdate, openingMode, ...others} = this.props;
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    if (middleClick) {
      let switchTo = false;
      this.getFlux().actions.session.popupOpen(componentTranslation[component] || componentPath, others, switchTo);
    } else if (!componentUpdate) {
      e.stopPropagation();
      let switchTo = true;
      
      if ( openingMode=='tab' ) {
      	this.getFlux().actions.session.tabOpen(componentTranslation[component] || componentPath, others, switchTo)
      } else { // Default: Popup
      	this.getFlux().actions.session.popupOpen(componentTranslation[component] || componentPath, others, switchTo)
      }
      
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
