import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import _forEach from 'lodash/forEach';
import _map from 'lodash/map';
import _filter from 'lodash/forEach';
import LinkedStateMixin from 'react-addons-linked-state-mixin';
import Immutable from 'immutable';
import classNames from 'classnames';
import Highlight from 'react-highlighter';
import ConfigMixin from 'mixins/ConfigMixin';
import Pluralise from 'ui/Pluralise';


import TextField from 'material-ui/lib/text-field';
import RaisedButton from 'material-ui/lib/raised-button';
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
      picked: Immutable.OrderedSet(),
      search: ''
    };
  },

  componentWillMount() {
    this.propertyGroups = Immutable.Map();
    _forEach(this.config.summaryValues, (val, key) => {
      this.propertyGroups = this.propertyGroups.set(key, {
        properties: val,
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

  handleAdd(groupId, propId) {
    if (this.state.picked.has(`${groupId}\t${propId}`))
      this.setState({picked: this.state.picked.delete(`${groupId}\t${propId}`)});
    else
      this.setState({picked: this.state.picked.add(`${groupId}\t${propId}`)});
  },
  handleAddAll(groupId) {
    let toAdd = _map(this.propertyGroups.get(groupId).properties, (prop) => `${groupId}\t${prop.propid}`);
    this.setState({picked: this.state.picked.union(toAdd)});
  },
  handleRemove(groupId, propId) {
    this.setState({picked: this.state.picked.delete(`${groupId}\t${propId}`)});
  },
  handleRemoveAll(groupId) {
    let toRemove = _map(this.propertyGroups.get(groupId).properties, (prop) => `${groupId}\t${prop.propid}`);
    this.setState({picked: this.state.picked.subtract(toRemove)});
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
    let groups = this.propertyGroups;
    let count = groups.map((group) => Object.keys(group.properties).length).reduce((sum, v) => sum + v, 0);
    return (
      <div className='large-modal item-picker'>
        <div className="horizontal stack">
          <div className="grow scroll-within">
            <div className="header">{count} <Pluralise text="Track" ord={count}/> Available</div>
            <div className="search">
              <TextField floatingLabelText="Search" valueLink={this.linkState('search')}/>
            </div>
            <List>
              {
                groups.map((group) => {
                  let {id, name, icon, properties} = group;
                  let subItems = _map(properties, (prop) => {
                      let {name, description, propid} = prop;
                      return (name + "#" + (description || '')).toLowerCase().indexOf(search.toLowerCase()) > -1 ? (
                        <ListItem className={classNames({picked: picked.includes(`${id}\t${propid}`)})}
                                  key={propid}
                                  primaryText={<div><Highlight search={search}>{name}</Highlight></div>}
                                  secondaryText={<div><Highlight search={search}>{description}</Highlight></div>}
                          //leftIcon={<div><Icon fixedWidth={true} name={picked.includes(`${id}\t${propid}`) ? "minus" : "plus"} /></div>}
                                  onClick={() => this.handleAdd(id, propid)}
                        />) : null;
                    }
                  );
                  let numberSubItems = subItems.filter((i) => i).length;
                  return numberSubItems > 0 ? (
                    <ListItem
                      primaryText={<div> {name} ({numberSubItems} <Pluralise text="Track" ord={numberSubItems}/>)</div>}
                      key={id}
                      initiallyOpen={true}
                      leftIcon={<Icon fixedWidth={true} name={icon}/>}//<div><Icon fixedWidth={true} name="plus"/></div>}
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
              <div className="header">{picked.size ? picked.size : 'No'} <Pluralise text="Track" ord={picked.size}/> to
                Add
              </div>
              <List>
                {
                  picked.map((trackId) => {
                    let [id, propid] = trackId.split('\t');
                    let {icon} = groups.get(id);
                    let groupName = groups.get(id).name;
                    let {description, name} = groups.get(id).properties[propid];
                    return <ListItem key={trackId}
                                     secondaryText={description}
                                     primaryText={`${groupName} - ${name}`}
                                     leftIcon={<div><Icon fixedWidth={true} name={icon}/></div>}
                                     onClick={() => this.handleRemove(id, propid)}/>;

                  }).toArray()
                }

              </List>
            </div>
            <div className='centering-container'>
              <RaisedButton label="Use" primary={true} onClick={this.handlePick}/>

            </div>
          </div>
        </div>
      </div>
    );
  }

});

module.exports = ItemPicker;
