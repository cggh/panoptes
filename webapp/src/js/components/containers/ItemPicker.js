import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import Highlight from 'react-highlighter';

import _map from 'lodash.map';
import _some from 'lodash.some';
import _clone from 'lodash.clone';

import PureRenderMixin from 'mixins/PureRenderMixin';

import TextField from '@material-ui/core/TextField';
import Button from 'ui/Button';
import {List, ListItem, ListItemText, ListItemIcon} from '@material-ui/core';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import Icon from 'ui/Icon';
import Pluralise from 'ui/Pluralise';

let ItemPicker = createReactClass({
  displayName: 'ItemPicker',

  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    itemName: PropTypes.string,
    groupName: PropTypes.string,
    pickVerb: PropTypes.string,
    initialSelection: PropTypes.arrayOf(
      PropTypes.shape({
        groupId: PropTypes.string.isRequired,
        itemGroupId: PropTypes.string.isRequired,
        itemId: PropTypes.string.isRequired,
        payload: PropTypes.any
      })),
    groups: PropTypes.objectOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        icon: PropTypes.string,
        items: PropTypes.arrayOf(
          PropTypes.shape({
            name: PropTypes.string.isRequired,
            icon: PropTypes.string,
            description: PropTypes.string,
            payload: PropTypes.any
          })
        ),
        itemGroups: PropTypes.objectOf(
          PropTypes.shape({
            name: PropTypes.string.isRequired,
            icon: PropTypes.string,
            items: PropTypes.arrayOf(
              PropTypes.shape({
                name: PropTypes.string.isRequired,
                icon: PropTypes.string,
                description: PropTypes.string,
                payload: PropTypes.any
              })
            ),
          })
        )
      })),
    onPick: PropTypes.func.isRequired,
    icon: PropTypes.string,
    title: PropTypes.string,
    classes: PropTypes.object
  },

  getDefaultProps() {
    return {
      title: 'Pick item',
      icon: 'check-square-o',
      itemName: 'Item',
      groupName: 'Group',
      pickVerb: 'Pick',
      initialSelection: []
    };
  },

  getInitialState() {
    return {
      picked: this.props.initialSelection,
      search: '',
      itemGroupsExpanded: {},
      groupsExpanded: {}
    };
  },

  icon() {
    return this.props.icon;
  },

  title() {
    return this.props.title;
  },

  handleEnter() {
    this.handlePick();
  },

  handleAdd({groupId, itemId, payload, itemGroupId}) {
    this.setState({picked: this.state.picked.concat([{groupId, itemId, payload, itemGroupId}])});
  },

  handleRemove(index) {
    let picked = this.state.picked;
    picked.splice(index, 1);
    this.setState({picked: [].concat(picked)});
  },

  handleRemoveAll() {
    this.setState({picked: []});
  },

  handlePick() {
    const {groups} = this.props;
    this.props.onPick(_map(this.state.picked,
      (item) => item.payload ||
      (item.itemGroupId ? groups[item.groupId].itemGroups[item.itemGroupId].items[item.itemId].payload : groups[item.groupId].items[item.itemId].payload)));
  },

  handleSearchChange(event) {
    this.setState({'search': event.target.value});
  },

  handleExpandGroup(groupId) {
    let groupsExpanded = _clone(this.state.groupsExpanded);
    let groupExpanded = groupsExpanded[groupId];
    if (groupExpanded === undefined) {
      groupExpanded = true;
    } else {
      groupExpanded = !groupExpanded;
    }
    groupsExpanded[groupId] = groupExpanded;
    this.setState({groupsExpanded: groupsExpanded});
  },

  // NOTE: An itemGroup is an item in a group (groupId) that is itself a group.
  handleExpandItemGroup(groupId, itemGroupId) {
    let itemGroupsExpanded = _clone(this.state.itemGroupsExpanded);
    if (itemGroupsExpanded[groupId] === undefined) {
      itemGroupsExpanded[groupId] = {};
    }
    let itemGroupExpanded = itemGroupsExpanded[groupId][itemGroupId];
    if (itemGroupExpanded === undefined) {
      itemGroupExpanded = true;
    } else {
      itemGroupExpanded = !itemGroupExpanded;
    }
    itemGroupsExpanded[groupId][itemGroupId] = itemGroupExpanded;
    this.setState({itemGroupsExpanded: itemGroupsExpanded});
  },

  isGroupExpanded(groupId) {
    return (this.state.groupsExpanded[groupId] !== undefined && this.state.groupsExpanded[groupId]);
  },

  isItemGroupExpanded(groupId, itemGroupId) {
    return (this.state.itemGroupsExpanded[groupId] !== undefined && this.state.itemGroupsExpanded[groupId][itemGroupId] !== undefined && this.state.itemGroupsExpanded[groupId][itemGroupId]);
  },

  convertItemTolistItem(item, itemId, search, groupId, itemGroupId) {
    let {name, description, icon, payload} = item;
    // Exclude this ListItem if this item's name and description doesn't contain the search text.
    return (`${name}#${description || ''}`).toLowerCase().indexOf(search.toLowerCase()) !== -1 ?
      (
        <ListItem
          button
          key={itemId}
          className={itemGroupId !== undefined && itemGroupId !== '_UNGROUPED_' ? 'nested-more' : 'nested'}
          onClick={() => this.handleAdd({groupId, itemId, payload, itemGroupId})}
        >
          {icon ?
            <ListItemIcon>
              <Icon fixedWidth={true} name={icon}/>
            </ListItemIcon>
            : null
          }
          <ListItemText
            primary={<Highlight search={search}>{name}</Highlight>}
            secondary={<Highlight search={search}>{description}</Highlight>}
          />
        </ListItem>
      ) : null;
  },

  render() {
    let {picked, search} = this.state;
    let {itemName, pickVerb, groups} = this.props;
    let totalItemsCount = 0;
    let listItems = _map(groups, (group, groupId) => {
      let {name, icon, items, itemGroups} = group;
      // Initialize an array to collect all of the ListItem components.
      let listItems = [];
      // Convert all of the items in this group into ListItem components.
      let nestedItems = _map(items, (item, itemId) => this.convertItemTolistItem(item, itemId, search, groupId));
      totalItemsCount += nestedItems.length;
      // If there are any nestedItems for this group (after search exclusions),
      // then convert this group to a ListItem component containing the nestedItems.
      if (nestedItems.length !== 0) {
        listItems.push(
          <div key={groupId + !!search}>
            <ListItem
              button
              onClick={() => this.handleExpandGroup(groupId)}
            >
              <ListItemIcon>
                <Icon fixedWidth={true} name={icon}/>
              </ListItemIcon>
              <ListItemText
                inset
                primary={<div> {name} ({nestedItems.length} <Pluralise text={itemName} ord={nestedItems.length}/>)</div>}
              />
              {this.isGroupExpanded(groupId) ? <ExpandMore /> : <ExpandLess />}
            </ListItem>
            <Collapse in={this.isGroupExpanded(groupId)} >
              {nestedItems}
            </Collapse>
          </div>
        );
      }
      if (itemGroups) {
        let totalItemGroupItemsCount = 0;
        let nestedItemGroups = [];
        if (itemGroups['_UNGROUPED_']) {
          nestedItemGroups = nestedItemGroups.concat(_map(itemGroups['_UNGROUPED_'].items, (item, itemId) => this.convertItemTolistItem(item, itemId, search, groupId, '_UNGROUPED_')));
          totalItemGroupItemsCount += nestedItemGroups.length;
        }
        // Convert all of the itemGroups and their items into ListItem components.
        nestedItemGroups = nestedItemGroups.concat(_map(itemGroups, (itemGroup, itemGroupId) => {
          if (itemGroupId === '_UNGROUPED_') return null;
          // Convert all of the items in this itemGroup into ListItem components.
          let itemGroupNestedItems = _map(itemGroup.items, (item, itemId) => this.convertItemTolistItem(item, itemId, search, groupId, itemGroupId));
          totalItemGroupItemsCount += itemGroupNestedItems.length;
          return _some(itemGroupNestedItems) ? (
            <div key={groupId + itemGroupId + !!search}>
              <ListItem
                button
                onClick={() => this.handleExpandItemGroup(groupId, itemGroupId)}
                className="nested"
              >
                {itemGroup.icon ?
                  <ListItemIcon>
                    <Icon fixedWidth={true} name={itemGroup.icon}/>
                  </ListItemIcon>
                  : null
                }
                <ListItemText
                  inset
                  primary={<span>{itemGroup.name} ({itemGroupNestedItems.length} <Pluralise text={itemName} ord={itemGroupNestedItems.length} />)</span>}
                />
                {this.isItemGroupExpanded(groupId, itemGroupId) ? <ExpandMore /> : <ExpandLess />}
              </ListItem>
              <Collapse in={this.isItemGroupExpanded(groupId, itemGroupId)} >
                {itemGroupNestedItems}
              </Collapse>
            </div>
          ) : null;
        }));
        totalItemsCount += totalItemGroupItemsCount;
        // If there are any nestedItemGroups for this group (after search exclusions),
        // then convert this group to a ListItem component containing the nestedItemGroups (along with their nestedItems).
        if (nestedItemGroups.length !== 0) {
          listItems.push(
            <div key={groupId + !!search}>
              <ListItem
                button
                onClick={() => this.handleExpandGroup(groupId)}
              >
                {icon ?
                  <ListItemIcon>
                    <Icon fixedWidth={true} name={icon} />
                  </ListItemIcon>
                  : null
                }
                <ListItemText
                  inset
                  primary={<div> {name} ({totalItemGroupItemsCount} <Pluralise text={itemName} ord={totalItemGroupItemsCount}/>)</div>}
                />
                {this.isGroupExpanded(groupId) ? <ExpandMore /> : <ExpandLess />}
              </ListItem>
              <Collapse in={this.isGroupExpanded(groupId)} >
                {nestedItemGroups}
              </Collapse>
            </div>
          );
        }
      }
      return listItems;
    });

    return (
      <div className="large-modal item-picker">
        <div className="horizontal stack">
          <div className="grow stack vertical scroll-within">
            <div>
              <div className="header">{totalItemsCount} <Pluralise text={itemName} ord={totalItemsCount}/> available</div>
              <div className="search">
                <TextField autoFocus label="Search" value={search} onChange={this.handleSearchChange}/>
              </div>
            </div>
            <div style={{overflow: 'auto'}}>
              <List>
                {listItems}
              </List>
            </div>
          </div>
          <div className="grow stack vertical">
            <div>
              <div className="header">{picked.length ? picked.length : 'No'} <Pluralise text={itemName} ord={picked.length}/> to {pickVerb}</div>
            </div>
            <div className="grow scroll-within">
              <List>
                {
                  _map(picked, (item, index) => {
                    let {groupId, itemGroupId, itemId} = item;
                    let groupName = groups[groupId].name;
                    let itemGroupName = itemGroupId ? groups[groupId].itemGroups[itemGroupId].name : '';
                    let {description, name, icon} = itemGroupId ? groups[groupId].itemGroups[itemGroupId].items[itemId] : groups[groupId].items[itemId];
                    let primaryText = itemGroupId ? `${groupName} - ${itemGroupName} - ${name}` : `${groupName} - ${name}`;

                    return (
                      <ListItem
                        button
                        key={index}
                        onClick={() => this.handleRemove(index)}
                      >
                        <ListItemIcon>
                          <Icon fixedWidth={true} name={icon}/>
                        </ListItemIcon>
                        <ListItemText
                          primary={primaryText}
                          secondary={description}
                        />
                      </ListItem>
                    );
                  })
                }
              </List>
            </div>
            <div className="centering-container">
              <div style={{paddingRight: '10px'}}><Button label="Clear" onClick={this.handleRemoveAll}/></div>
              <Button
                raised="true"
                label={<span>{`${pickVerb} ${picked.length}`} <Pluralise text={itemName} ord={picked.length}/></span>}
                color="primary"
                onClick={this.handlePick}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
});

export default ItemPicker;
