import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ImmutablePropTypes from 'react-immutable-proptypes';
import Immutable from 'immutable';
import Highlight from 'react-highlighter';
import Pluralise from 'ui/Pluralise';


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
    initialSelection: ImmutablePropTypes.listOf(
      ImmutablePropTypes.contains({
        groupId: React.PropTypes.string.isRequired,
        itemId: React.PropTypes.string.isRequired,
        payload: React.PropTypes.any
      })),
    groups: ImmutablePropTypes.mapOf(
      ImmutablePropTypes.contains({
        name: React.PropTypes.string.isRequired,
        icon: React.PropTypes.string,
        items: ImmutablePropTypes.mapOf(
          ImmutablePropTypes.contains({
            name: React.PropTypes.string.isRequired,
            icon: React.PropTypes.string,
            description: React.PropTypes.string,
            payload: React.PropTypes.any
          })
        )
      })),
    onPick: React.PropTypes.func.isRequired
  },

  getDefaultProps() {
    return {
      title: 'Pick items',
      icon: 'check-square-o',
      itemName: 'Item',
      itemVerb: 'Select',
      initialSelection: Immutable.List()
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
    this.setState({picked: this.state.picked.push(Immutable.Map({groupId, itemId, payload}))});
  },
  handleAddAll(groupId) {
    let toAdd = this.props.groups.getIn([groupId, 'items']).map((item, itemId) =>
      Immutable.Map({groupId, itemId, payload: item.get('payload')})).toList();
    this.setState({picked: this.state.picked.concat(toAdd)});
  },
  handleRemove(index) {
    this.setState({picked: this.state.picked.delete(index)});
  },
  handleRemoveAll(index) {
    this.setState({picked: Immutable.List()});
  },
  handlePick() {
    this.props.onPick(this.state.picked);
  },
  handleSearchChange(event) {
    this.setState({'search': event.target.value});
  },


  render() {
    let {picked, search} = this.state;
    let {itemName, itemVerb, groups} = this.props;
    let count = groups.map((group) => group.get('items').size).reduce((sum, v) => sum + v, 0);
    return (
      <div className="large-modal item-picker">
        <div className="horizontal stack">
          <div className="grow scroll-within">
            <div className="header">{count} <Pluralise text={itemName} ord={count}/> available</div>
            <div className="search">
              <TextField floatingLabelText="Search" value={search} onChange={this.handleSearchChange}/>
            </div>
            <List>
              {
                groups.map((group, groupId) => {
                  let {name, icon, items} = group.toObject();
                  let subItems = items.map((item, itemId) => {
                    let {name, description, icon, payload} = item.toObject();
                    return (name + '#' + (description || '')).toLowerCase().indexOf(search.toLowerCase()) > -1 ? (
                      <ListItem key={itemId}
                                primaryText={<div><Highlight search={search}>{name}</Highlight></div>}
                                secondaryText={<div><Highlight search={search}>{description}</Highlight></div>}
                                leftIcon={<div><Icon fixedWidth={true} name={icon}/></div>}
                                onClick={() => this.handleAdd({groupId, itemId, payload})}
                      />) : null;
                  });
                  let numberSubItems = subItems.filter((i) => i).size;
                  return numberSubItems > 0 ? (
                    <ListItem
                      primaryText={<div> {name} ({numberSubItems} <Pluralise text={itemName} ord={numberSubItems}/>)</div>}
                      key={groupId + !!search}
                      initiallyOpen={!!search}
                      leftIcon={<Icon fixedWidth={true} name={icon}/>}
                      primaryTogglesNestedList={true}
                      nestedItems={subItems.toArray()}
                    />

                  ) : null;
                }).toArray()
              }
            </List>
          </div>
          <div className="grow stack vertical">
            <div className="grow scroll-within">
              <div className="header">{picked.size ? picked.size : 'No'} <Pluralise text={itemName} ord={picked.size}/> to {itemVerb}</div>
              <List>
                {
                  picked.map((item, index) => {
                    let {groupId, itemId} = item.toObject();
                    let groupName = groups.getIn([groupId, 'name']);
                    let {description, name, icon} = groups.getIn([groupId, 'items', itemId]).toObject();
                    return <ListItem key={index}
                                     secondaryText={description}
                                     primaryText={`${groupName} - ${name}`}
                                     leftIcon={<div><Icon fixedWidth={true} name={icon}/></div>}
                                     onClick={() => this.handleRemove(index)}/>;

                  }).toArray()
                }

              </List>
            </div>
            <div className="centering-container">
              <div style={{paddingRight: '10px'}}><FlatButton label="Clear" onClick={this.handleRemoveAll}/></div>
              <RaisedButton label={<span>{`${itemVerb} ${picked.size}`} <Pluralise text={itemName} ord={picked.size}/></span>}
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
