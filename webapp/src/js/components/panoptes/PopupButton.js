import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import Icon from 'ui/Icon';
import RaisedButton from 'material-ui/RaisedButton';
import filterChildren from 'util/filterChildren';
import _isArray from 'lodash/isArray';

// TODO: Deprecate ItemMap in favour of TableMap or Map

const componentTranslation = {
  ItemMap: 'Map/Table/Actions',
  Map: 'Map/Table/Actions',
  Tree: 'containers/TreeWithActions',
  Plot: 'containers/PlotWithActions',
  PivotTable: 'containers/PivotTableWithActions',
  DataTable: 'containers/DataTableWithActions'
};

let PopupButton = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    label: React.PropTypes.string,
    icon: React.PropTypes.string,
    children: React.PropTypes.node,
    openingMode: React.PropTypes.string,
  },

  getDefaultProps() {
    return {
      label: 'Untitled',
      icon: 'circle',
      openingMode: 'tab'
    };
  },

  handleClick(e) {
    let {children, openingMode} = this.props;
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    if (openingMode === 'tab') {
        this.getFlux().actions.session.tabOpen(filterChildren(this, children), !middleClick);
    } else {
        this.getFlux().actions.session.popupOpen(filterChildren(this, children), !middleClick);
    }
  },

  render() {
    let {children, label, icon} = this.props;
    children = filterChildren(this, children);
    if (_isArray(children)) {
      throw Error('PopupButton can only have one child');
    }
    if (!children) {
      throw Error('PopupButton can only have one child not none');
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
