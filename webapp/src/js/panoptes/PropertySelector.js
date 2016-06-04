import React from 'react';
import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import DropDownMenu from 'material-ui/DropDownMenu';
import MenuItem from 'material-ui/MenuItem';


const PropertySelector = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        'onSelect'
      ],
      check: [
        'table',
        'value'
      ]
    }),
    ConfigMixin
  ],

  propTypes: {
    table: React.PropTypes.string,
    value: React.PropTypes.string,
    onSelect: React.PropTypes.func
  },

  render() {
    const { table, value } = this.props;
    return (
      <DropDownMenu className="dropdown"
                  value={value}
                  onChange={(e, i, v) => this.redirectedProps.onSelect(v)}>
        <MenuItem key="__none__" value={undefined} primaryText="None"/>
        {this.config.tablesById[table].properties.map((property) =>
          <MenuItem key={property.id} value={property.id} primaryText={property.name}/>)}
      </DropDownMenu>
    );
  }
});

export default PropertySelector;
