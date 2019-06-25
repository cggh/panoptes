import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import Divider from '@material-ui/core/Divider';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import uid from 'uid';
import {FormControl} from '@material-ui/core';
import {Input, InputLabel} from '@material-ui/core';


const PropertySelector = createReactClass({
  displayName: 'PropertySelector',

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
    table: PropTypes.string,
    value: PropTypes.string,
    filter: PropTypes.func,
    onSelect: PropTypes.func,
    label: PropTypes.string,
    allowNull: PropTypes.bool,
    fullWidth: PropTypes.bool
  },

  getDefaultProps() {
    return {
      filter: () => true,
      fullWidth: true
    };
  },

  getInitialState() {
    return {
      uid: uid(5)
    };
  },


  render() {
    const {table, value, label, filter, allowNull} = this.props;

    let propertyMenu = [];
    if (allowNull) {
      propertyMenu.push(
        <MenuItem key="NULL_VAL" value="">
          <em>None</em>
        </MenuItem>
      );
    }
    let i = 0;
    if (table) {
      const propertyGroups = this.config.tablesById[table].propertyGroups;
      // Don't show the ungrouped group name if the ungrouped group is the only group (onlyUngrouped)
      // i.e. show the group name if there isn't only one group and that is the ungrouped group (!onlyUngrouped)
      const onlyUngrouped = (propertyGroups.length === 1 && propertyGroups[0].id === '_UNGROUPED_');
      propertyGroups.forEach((group) => {
        let filteredProps = group.visibleProperties.filter(filter);
        if (filteredProps.length === 0) return;
        if (propertyMenu.length) {
          propertyMenu.push(<Divider key={i++}/>);
        }
        let {id, name} = group;
        let groupId = id;
        if (!onlyUngrouped) {
          propertyMenu.push(<MenuItem disabled value={id} key={`group_${groupId}`} >{name}</MenuItem>);
        }
        filteredProps.forEach((property) => {
          let {id, name} = property;
          propertyMenu.push(<MenuItem value={id} key={`group_${groupId}_item_${id}`} >{name}</MenuItem>);
        });
      });
    }

    return (
      <FormControl style={{minWidth: '100px'}} fullWidth={this.props.fullWidth}>
        <InputLabel htmlFor={this.state.uid}>{label}</InputLabel>
        <Select
          autoWidth={true}
          value={value ? value : ''}
          onChange={(e) => this.redirectedProps.onSelect(e.target.value === '' ? null : e.target.value)}
          input={<Input id={this.state.uid} />}
        >
          {propertyMenu}
        </Select>
      </FormControl>
    );
  },
});

export default PropertySelector;
