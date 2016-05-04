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
    component: React.PropTypes.string,
    label: React.PropTypes.string,
    icon: React.PropTypes.string,
    //rest of proptypes depend on component
  },

  handleClick() {
    const {label, icon, component, ...others} = this.props;
    this.flux.actions.session.popupOpen(
      componentTranslation[component],
      others);
  },

  render() {
    const {label, icon, component} = this.props;
    if (!componentTranslation.hasOwnProperty(component)) {
      console.error(`${component} is not a valid component name (from PopupButton)`);
    }
    return <RaisedButton
      label={label}
      primary={true}
      icon={icon ? <Icon name={icon} />:null}
      style={{color:'white'}}
      labelStyle={{textTransform:'inherit'}}
      onClick={this.handleClick}
    />
  }

});

export default PopupButton;
