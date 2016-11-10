import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import Highlight from 'react-highlighter';
import Pluralise from 'ui/Pluralise';

import _map from 'lodash/map';
import _some from 'lodash/some';

import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import FlatButton from 'material-ui/FlatButton';
import {List, ListItem} from 'material-ui/List';
import Icon from 'ui/Icon';


let ItemPicker = React.createClass({
  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    itemName: React.PropTypes.string,
    groupName: React.PropTypes.string,
    pickVerb: React.PropTypes.string,
    initialSelection: React.PropTypes.arrayOf(
      React.PropTypes.shape({
        groupId: React.PropTypes.string.isRequired,
        itemId: React.PropTypes.string.isRequired,
        payload: React.PropTypes.any
      })),
    groups: React.PropTypes.objectOf(
      React.PropTypes.shape({
        name: React.PropTypes.string.isRequired,
        icon: React.PropTypes.string,
        items: React.PropTypes.objectOf(
          React.PropTypes.shape({
            name: React.PropTypes.string.isRequired,
            icon: React.PropTypes.string,
            description: React.PropTypes.string,
            payload: React.PropTypes.any
          })
        ),
        itemGroups: React.PropTypes.objectOf(
          React.PropTypes.shape({
            name: React.PropTypes.string.isRequired,
            icon: React.PropTypes.string,
            items: React.PropTypes.arrayOf(
              React.PropTypes.shape({
                name: React.PropTypes.string.isRequired,
                icon: React.PropTypes.string,
                description: React.PropTypes.string,
                payload: React.PropTypes.any
              })
            ),
          })
        )
      })),
    onPick: React.PropTypes.func.isRequired,
    icon: React.PropTypes.string,
    title: React.PropTypes.string
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
      search: ''
    };
  },

  componentWillMount() {
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
    this.props.onPick(_map(this.state.picked, (item) => item.payload || groups[item.groupId].items[item.itemId].payload));
  },
  handleSearchChange(event) {
    this.setState({'search': event.target.value});
  },

  convertItemTolistItem(item, itemId, search, groupId, itemGroupId) {
    let {name, description, icon, payload} = item;
    // Exclude this ListItem if this item's name and description doesn't contain the search text.
    return (name + '#' + (description || '')).toLowerCase().indexOf(search.toLowerCase()) !== -1 ?
      (
        <ListItem
          key={itemId}
          primaryText={<div><Highlight search={search}>{name}</Highlight></div>}
          secondaryText={<div><Highlight search={search}>{description}</Highlight></div>}
          leftIcon={icon ? <Icon fixedWidth={true} name={icon}/> : null}
          onClick={() => this.handleAdd({groupId, itemId, payload, itemGroupId})}
        />
      ) : null;
  },

  render() {
    let {picked, search} = this.state;
    let {itemName, pickVerb, groups, groupName} = this.props;
    let tolalItemsCount = 0;
    let listItems = _map(groups, (group, groupId) => {
      let {name, icon, items, itemGroups} = group;
      // Initialize an array to collect all of the ListItem components.
      let listItems = [];
      // Convert all of the items in this group into ListItem components.
      let nestedItems = _map(items, (item, itemId) => this.convertItemTolistItem(item, itemId, search, groupId));
      tolalItemsCount += nestedItems.length;
      // If there are any nestedItems for this group (after search exclusions),
      // then convert this group to a ListItem component containing the nestedItems.
      if (nestedItems.length !== 0) {
        listItems.push(
          <ListItem
            primaryText={<div> {name} ({nestedItems.length} <Pluralise text={itemName} ord={nestedItems.length}/>)</div>}
            key={groupId + !!search}
            initiallyOpen={!!search}
            leftIcon={icon ? <Icon fixedWidth={true} name={icon}/> : null}
            primaryTogglesNestedList={true}
            nestedItems={nestedItems}
          />
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
            <ListItem
              primaryText={<div> {itemGroup.name} ({itemGroupNestedItems.length} <Pluralise text={itemName}
                                                                                            ord={itemGroupNestedItems.length}/>)
              </div>}
              key={groupId + itemGroupId + !!search}
              initiallyOpen={!!search}
              leftIcon={itemGroup.icon ? <Icon fixedWidth={true} name={itemGroup.icon}/> : null}
              primaryTogglesNestedList={true}
              nestedItems={itemGroupNestedItems}
            />
          ) : null;
        }));
        tolalItemsCount += totalItemGroupItemsCount;
        // If there are any nestedItemGroups for this group (after search exclusions),
        // then convert this group to a ListItem component containing the nestedItemGroups (along with their nestedItems).
        if (nestedItemGroups.length !== 0) {
          listItems.push(
            <ListItem
              primaryText={<div> {name} ({totalItemGroupItemsCount} <Pluralise text={itemName}
                                                                               ord={totalItemGroupItemsCount}/>)</div>}
              key={groupId + !!search}
              initiallyOpen={!!search}
              leftIcon={icon ? <Icon fixedWidth={true} name={icon}/> : null}
              primaryTogglesNestedList={true}
              nestedItems={nestedItemGroups}
            />
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
              <div className="header">{tolalItemsCount} <Pluralise text={itemName} ord={tolalItemsCount}/> available</div>
              <div className="search">
                <TextField floatingLabelText="Search" value={search} onChange={this.handleSearchChange}/>
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
                        key={index}
                        secondaryText={description}
                        primaryText={primaryText}
                        leftIcon={<div><Icon fixedWidth={true} name={icon}/></div>}
                        onClick={() => this.handleRemove(index)}
                      />
                    );
                  })
                }
              </List>
            </div>
            <div className="centering-container">
              <div style={{paddingRight: '10px'}}><FlatButton label="Clear" onClick={this.handleRemoveAll}/></div>
              <RaisedButton
                label={<span>{`${pickVerb} ${picked.length}`} <Pluralise text={itemName} ord={picked.length}/></span>}
                primary={true}
                onClick={this.handlePick}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

});

export default ItemPicker;
