import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import Highlight from 'react-highlighter';
import Pluralise from 'ui/Pluralise';

import _map from 'lodash/map';
import _filter from 'lodash/filter';
import _sum from 'lodash/sum';
import _values from 'lodash/values';

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
    itemVerb: React.PropTypes.string,
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
        )
      })),
    onPick: React.PropTypes.func.isRequired,
    icon: React.PropTypes.string,
    title: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      title: 'Pick items',
      icon: 'check-square-o',
      itemName: 'Item',
      itemVerb: 'Select',
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

  handleAdd({groupId, itemId, payload}) {
    this.setState({picked: this.state.picked.concat([{groupId, itemId, payload}])});
  },
  handleAddAll(groupId) {
    let toAdd = _map(this.props.groups[groupId].items, (item, itemId) =>
      ({groupId, itemId, payload: item.payload}));
    this.setState({picked: this.state.picked.concat(toAdd)});
  },
  handleRemove(index) {
    let picked = this.state.picked;
    picked.splice(index,1);
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


  render() {
    let {picked, search} = this.state;
    let {itemName, itemVerb, groups} = this.props;
    let count = _sum(_map(groups, (group) => _values(group.items).length));
    return (
      <div className="large-modal item-picker">
        <div className="horizontal stack">
          <div className="grow stack vertical scroll-within">
            <div>
              <div className="header">{count} <Pluralise text={itemName} ord={count}/> available</div>
              <div className="search">
                <TextField floatingLabelText="Search" value={search} onChange={this.handleSearchChange}/>
              </div>
            </div>
            <div style={{overflow: 'auto'}}>
              <List>
                {
                  _map(groups, (group, groupId) => {
                    let {name, icon, items} = group;
                    let subItems = _map(items, (item, itemId) => {
                      let {name, description, icon, payload} = item;
                      return (name + '#' + (description || '')).toLowerCase().indexOf(search.toLowerCase()) > -1 ? (
                        <ListItem key={itemId}
                                  primaryText={<div><Highlight search={search}>{name}</Highlight></div>}
                                  secondaryText={<div><Highlight search={search}>{description}</Highlight></div>}
                                  leftIcon={<div><Icon fixedWidth={true} name={icon}/></div>}
                                  onClick={() => this.handleAdd({groupId, itemId, payload})}
                        />) : null;
                    });
                    let numberSubItems = _filter(subItems, (i) => i).length;
                    return numberSubItems > 0 ? (
                      <ListItem
                        primaryText={<div> {name} ({numberSubItems} <Pluralise text={itemName} ord={numberSubItems}/>)</div>}
                        key={groupId + !!search}
                        initiallyOpen={!!search}
                        leftIcon={<Icon fixedWidth={true} name={icon}/>}
                        primaryTogglesNestedList={true}
                        nestedItems={subItems}
                      />

                    ) : null;
                  })
                }
              </List>
            </div>
          </div>
          <div className="grow stack vertical">
            <div>
              <div className="header">{picked.length ? picked.length : 'No'} <Pluralise text={itemName} ord={picked.length}/> to {itemVerb}</div>
            </div>
            <div className="grow scroll-within">
              <List>
                {
                  _map(picked, (item, index) => {
                    let {groupId, itemId} = item;
                    let groupName = groups[groupId].name;
                    let {description, name, icon} = groups[groupId].items[itemId];
                    return <ListItem key={index}
                                     secondaryText={description}
                                     primaryText={`${groupName} - ${name}`}
                                     leftIcon={<div><Icon fixedWidth={true} name={icon}/></div>}
                                     onClick={() => this.handleRemove(index)}/>;

                  })
                }

              </List>
            </div>
            <div className="centering-container">
              <div style={{paddingRight: '10px'}}><FlatButton label="Clear" onClick={this.handleRemoveAll}/></div>
              <RaisedButton label={<span>{`${itemVerb} ${picked.length}`} <Pluralise text={itemName} ord={picked.length}/></span>}
                            primary={true}
                            onClick={this.handlePick}/>
            </div>
          </div>
        </div>
      </div>
    );
  }

});

module.exports = ItemPicker;
