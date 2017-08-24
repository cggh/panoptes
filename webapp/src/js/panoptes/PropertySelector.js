import React from 'react';
import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import Divider from 'material-ui/Divider';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import _each from 'lodash.foreach';
import _filter from 'lodash.filter';


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
    filter: React.PropTypes.func,
    onSelect: React.PropTypes.func,
    label: React.PropTypes.string,
    allowNull: React.PropTypes.bool
  },

  getDefaultProps() {
    return {
      filter: () => true
    };
  },

  render() {
    const {table, value, label, filter, allowNull} = this.props;

    let propertyMenu = allowNull ? [<MenuItem value="__NULL__" key="__NULL__" primaryText="None"/>] : [];
    let i = 0;
    if (table) {
      const propertyGroups = this.config.tablesById[table].propertyGroups;
      _each(propertyGroups, (group) => {
        let filteredProps = _filter(group.visibleProperties, filter);
        if (filteredProps.length == 0) return;
        if (propertyMenu.length ) {
          propertyMenu.push(<Divider key={i++}/>);
        }
        let {id, name} = group;
        let groupId = id;
        propertyMenu.push(<MenuItem disabled value={id} key={`group_${groupId}`} primaryText={name}/>);
        _each(filteredProps, (property) => {
          let {id, name} = property;
          propertyMenu.push(<MenuItem value={id} key={`group_${groupId}_item_${id}`} primaryText={name}/>);
        });
      });
    }

    return (
    <SelectField value={value === '__NULL__' ? undefined : value}
                 autoWidth={true}
                 floatingLabelText={label}
                 onChange={(e, i, v) => this.redirectedProps.onSelect(v === '__NULL__' ? null : v)}>
      {propertyMenu}
    </SelectField>
    );
  }
});

export default PropertySelector;
