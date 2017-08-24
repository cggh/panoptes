import React from 'react';

import _map from 'lodash.map';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import FluxMixin from 'mixins/FluxMixin';
import filterChildren from 'util/filterChildren';
import _find from 'lodash.find';

let SelectComponent = React.createClass({

  mixins: [
    FluxMixin,
  ],


  propTypes: {
    hintText: React.PropTypes.string,
    children: React.PropTypes.node,
    selectedIndex: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      hintText: 'Choose',
    };
  },

  render() {
    let {selectedIndex, hintText, children} = this.props;
    children = filterChildren(this, React.Children.toArray(children), ['option']);
    let selectedValue = _find(children, (child) => child.props.index === selectedIndex);
    return <SelectField hintText={hintText} value={selectedIndex ? selectedValue : null} onChange={(e,k,v) => {
        this.getFlux().actions.session.popupOpen(filterChildren(this, React.Children.toArray(v.props.children)));
      }}>
        {_map(children, (row) =>
          <MenuItem value={row} primaryText={row.props.label}/>)}
      </SelectField>;
  }
});

export default SelectComponent;

