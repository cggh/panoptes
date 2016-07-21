import React from 'react';
import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import Divider from 'material-ui/Divider';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import _each from 'lodash/map';


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
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: React.PropTypes.string,
    value: React.PropTypes.string,
    onSelect: React.PropTypes.func
  },

  render() {
    const { table, value, label} = this.props;

    let propertyMenu = [];
    let i = 0;
    if (table) {
      const propertyGroups = this.config.tablesById[table].propertyGroups;
      _each(propertyGroups, (group) => {
        if (propertyMenu.length) {
          propertyMenu.push(<Divider key={i++}/>);
        }
        let {id, name} = group;
        propertyMenu.push(<MenuItem disabled value={id} key={id} primaryText={name}/>);
        _each(group.properties, (property) => {
          let {id, name} = property;
          propertyMenu.push(<MenuItem value={id} key={id} primaryText={name}/>);
        });
      });
    }

    return (
    <SelectField value={value}
                 autoWidth={true}
                 floatingLabelText={label}
                 onChange={(e, i, v) => this.redirectedProps.onSelect(v)}>
      {propertyMenu}
    </SelectField>
    );
  }
});

export default PropertySelector;
