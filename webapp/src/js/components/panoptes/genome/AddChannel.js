import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import _forEach from 'lodash/forEach';
import _map from 'lodash/map';
import _transform from 'lodash/transform';
import LinkedStateMixin from 'react-addons-linked-state-mixin';
import Immutable from 'immutable';
import classNames from 'classnames';
import Highlight from 'react-highlighter';
import ConfigMixin from 'mixins/ConfigMixin';
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
    LinkedStateMixin,
    ConfigMixin
  ],

  propTypes: {
    onPick: React.PropTypes.func.isRequired
  },

  getDefaultProps() {
    return {};
  },

  getInitialState() {
    return {
      picked: Immutable.List(),
      search: ''
    };
  },

  componentWillMount() {
    this.channelGroups = Immutable.Map();
    _forEach(this.config.summaryValues, (properties, key) => {
      this.channelGroups = this.channelGroups.set(key, {
        channels: _transform(properties, (result, prop) => result[prop.propid] = {
          name: prop.name,
          description: prop.description,
          icon: prop.settings.isCategorical ? 'bar-chart' : 'line-chart'
        }, {}),
        id: key,
        name: key === '__reference__' ? 'Reference' : this.config.tables[key].tableCapNamePlural,
        icon: key === '__reference__' ? 'bitmap:genomebrowser.png' : this.config.tables[key].icon
      });
    });
  },

  icon() {
    return 'check-square-o';
  },
  title() {
    return 'Add genome track';
  },

  handleEnter() {
    this.handlePick();
  },

  handleAdd(groupId, channelId) {
    this.setState({picked: this.state.picked.push(`${groupId}\t${channelId}`)});
  },
  handleAddAll(groupId) {
    let toAdd = _map(this.channelGroups.get(groupId).channels, (channel, channelId) => `${groupId}\t${channelId}`);
    this.setState({picked: this.state.picked.push(...toAdd)});
  },
  handleRemove(index) {
    this.setState({picked: this.state.picked.delete(index)});
  },
  handleRemoveAll(index) {
    this.setState({picked: Immutable.List()});
  },
  handlePick() {
    this.props.onPick(Immutable.fromJS({
      component: 'NumericalChannel',
      props: {
        tracks: this.state.picked
      }
    }));
  },

  render() {
    let {picked, search} = this.state;
    let groups = this.channelGroups;
    let count = groups.map((group) => Object.keys(group.channels).length).reduce((sum, v) => sum + v, 0);
    return (
      <div className="large-modal item-picker">
        <div className="horizontal stack">
          <div className="grow scroll-within">
            <div className="header">{count} <Pluralise text="Channel" ord={count}/> Available</div>
            <div className="search">
              <TextField floatingLabelText="Search" valueLink={this.linkState('search')}/>
            </div>
            <List>
              {
                groups.map((group) => {
                  let {id, name, icon, channels} = group;
                  let subItems = _map(channels, (channel, channelId) => {
                    let {name, description, icon} = channel;
                    return (name + '#' + (description || '')).toLowerCase().indexOf(search.toLowerCase()) > -1 ? (
                      <ListItem key={channelId}
                                primaryText={<div><Highlight search={search}>{name}</Highlight></div>}
                                secondaryText={<div><Highlight search={search}>{description}</Highlight></div>}
                                leftIcon={<div><Icon fixedWidth={true} name={icon}/></div>}
                                onClick={() => this.handleAdd(id, channelId)}
                      />) : null;
                  });
                  let numberSubItems = subItems.filter((i) => i).length;
                  return numberSubItems > 0 ? (
                    <ListItem
                      primaryText={<div> {name} ({numberSubItems} <Pluralise text="Channel" ord={numberSubItems}/>)</div>}
                      key={id}
                      initiallyOpen={true}
                      leftIcon={<Icon fixedWidth={true} name={icon}/>}
                      onClick={() => this.handleAddAll(id)}
                      nestedItems={subItems}
                    />

                  ) : null;
                }).toArray()
              }
            </List>
          </div>
          <div className="grow stack vertical">
            <div className="grow scroll-within">
              <div className="header">{picked.size ? picked.size : 'No'} <Pluralise text="Channel" ord={picked.size}/> to Add</div>
              <List>
                {
                  picked.map((groupChannelId, index) => {
                    let [id, channelId] = groupChannelId.split('\t');
                    let groupName = groups.get(id).name;
                    let {description, name, icon} = groups.get(id).channels[channelId];
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
              <RaisedButton disabled={picked.size === 0} label={`Add ${picked.size} channels`} primary={true}
                            onClick={this.handlePick}/>
            </div>
          </div>
        </div>
      </div>
    );
  }

});

module.exports = ItemPicker;
