import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ImmutablePropTypes from 'react-immutable-proptypes';
import LinkedStateMixin from 'react-addons-linked-state-mixin';
import Immutable from 'immutable';
import Highlight from 'react-highlighter';
import Pluralise from 'ui/Pluralise';


import TextField from 'material-ui/lib/text-field';
import RaisedButton from 'material-ui/lib/raised-button';
import FlatButton from 'material-ui/lib/flat-button';
import List from 'material-ui/lib/lists/list';
import ListItem from 'material-ui/lib/lists/list-item';

import Icon from 'ui/Icon';


let ItemPicker = React.createClass({
  mixins: [
    PureRenderMixin,
    LinkedStateMixin
  ],

  propTypes: {
    itemName: React.PropTypes.string,
    groups: ImmutablePropTypes.mapOf(
      ImmutablePropTypes.contains({
        name: React.PropTypes.string.isRequired,
        icon: React.PropTypes.string,
        items: ImmutablePropTypes.mapOf(
          ImmutablePropTypes.contains({
            name: React.PropTypes.string.isRequired,
            icon: React.PropTypes.string,
            description: React.PropTypes.string
          })
        )
      })),
    onPick: React.PropTypes.func.isRequired
  },

  getDefaultProps() {
    return {
      title: 'Pick items',
      icon: 'check-square-o',
      itemName: 'Item'
    };
  },

  getInitialState() {
    return {
      picked: Immutable.List(),
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

  handleAdd({groupId, itemId}) {
    this.setState({picked: this.state.picked.push({groupId, itemId})});
  },
  handleAddAll(groupId) {
    let toAdd = this.props.groups.getIn([groupId, 'items']).map((item, itemId) => ({groupId, itemId}));
    this.setState({picked: this.state.picked.push(...toAdd)});
  },
  handleRemove(index) {
    this.setState({picked: this.state.picked.delete(index)});
  },
  handleRemoveAll(index) {
    this.setState({picked: Immutable.List()});
  },
  handlePick() {
    this.props.onPick(this.state.picked.toArray());
  },

  render() {
    let {picked, search} = this.state;
    let {itemName, groups} = this.props;
    let count = groups.map((group) => group.get('items').size).reduce((sum, v) => sum + v, 0);
    return (
      <div className="large-modal item-picker">
        <div className="horizontal stack">
          <div className="grow scroll-within">
            <div className="header">{count} <Pluralise text={itemName} ord={count}/> Available</div>
            <div className="search">
              <TextField floatingLabelText="Search" valueLink={this.linkState('search')}/>
            </div>
            <List>
              {
                groups.map((group, groupId) => {
                  let {name, icon, items} = group.toObject();
                  let subItems = items.map((item, itemId) => {
                    let {name, description, icon} = item.toObject();
                    return (name + '#' + (description || '')).toLowerCase().indexOf(search.toLowerCase()) > -1 ? (
                      <ListItem key={itemId}
                                primaryText={<div><Highlight search={search}>{name}</Highlight></div>}
                                secondaryText={<div><Highlight search={search}>{description}</Highlight></div>}
                                leftIcon={<div><Icon fixedWidth={true} name={icon}/></div>}
                                onClick={() => this.handleAdd({groupId, itemId})}
                      />) : null;
                  });
                  let numberSubItems = subItems.filter((i) => i).size;
                  return numberSubItems > 0 ? (
                    <ListItem
                      primaryText={<div> {name} ({numberSubItems} <Pluralise text={itemName} ord={numberSubItems}/>)</div>}
                      key={groupId}
                      initiallyOpen={true}
                      leftIcon={<Icon fixedWidth={true} name={icon}/>}
                      onClick={() => this.handleAddAll(groupId)}
                      nestedItems={subItems.toArray()}
                    />

                  ) : null;
                }).toArray()
              }
            </List>
          </div>
          <div className="grow stack vertical">
            <div className="grow scroll-within">
              <div className="header">{picked.size ? picked.size : 'No'} <Pluralise text={itemName} ord={picked.size}/> Selected</div>
              <List>
                {
                  picked.map(({groupId, itemId}, index) => {
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
              <RaisedButton disabled={picked.size === 0}
                            label={<span>{`Add ${picked.size}`} <Pluralise text={itemName} ord={picked.size}/></span>}
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
