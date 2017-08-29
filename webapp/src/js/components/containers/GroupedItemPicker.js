import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import classNames from 'classnames';
import Highlight from 'react-highlighter';

import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import {List, ListItem} from 'material-ui/List';
import _map from 'lodash.map';
import _includes from 'lodash.includes';
import _intersection from 'lodash.intersection';
import _union from 'lodash.union';
import _without from 'lodash.without';
import _forEach from 'lodash.foreach';
import _sumBy from 'lodash.sumby';
import _filter from 'lodash.filter';
import _difference from 'lodash.difference';
import Icon from 'ui/Icon';


let GroupedItemPicker = createReactClass({
  displayName: 'GroupedItemPicker',

  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    groups: PropTypes.objectOf(PropTypes.object),
    initialPick: PropTypes.arrayOf(PropTypes.string),
    onPick: PropTypes.func,
    title: PropTypes.string
  },

  getDefaultProps() {
    return {
      groups: {},
      initialPick: [],
      title: 'Pick items'
    };
  },

  getInitialState() {
    return {
      picked: this.props.initialPick,
      search: ''
    };
  },

  componentWillMount() {
  },

  icon() {
    return 'check-square-o';
  },

  title() {
    return this.props.title;
  },

  handleEnter() {
    this.handlePick();
  },

  handleAdd(propId) {
    if (_includes(this.state.picked, propId)) {
      this.setState({picked: _without(this.state.picked, propId)});
    } else {
      this.setState({picked: this.state.picked.concat([propId])});
    }
  },

  handleAddAll(groupId) {
    let toAdd = _map(this.props.groups[groupId].properties, 'id');
    this.setState({picked: _union(this.state.picked, toAdd)});
  },

  handleRemove(propId) {
    this.setState({picked: _without(this.state.picked, propId)});
  },

  handleRemoveAll(groupId) {
    let toRemove = _map(this.props.groups[groupId].properties, 'id');
    this.setState({picked: _difference(this.state.picked, toRemove)});
  },

  handleSearchChange(event) {
    this.setState({'search': event.target.value});
  },

  handlePick() {
    let result = [];
    _forEach(this.props.groups, (group) => {
      _forEach(group.properties, (prop) => {
        if (_includes(this.state.picked, prop.id)) {
          result.push(prop.id);
        }
      });
    }
    );
    this.props.onPick(result);
  },

  render() {
    let {picked, search} = this.state;
    let {groups} = this.props;
    let count = _sumBy(groups, (group) => group.properties.length);
    return (
      <div className="large-modal item-picker">
        <div className="horizontal stack">
          <div className="grow stack vertical scroll-within">
            <div>
              <div className="header">{count} Column{count != 1 ? 's' : null} Available</div>
              <div className="search">
                <TextField autoFocus floatingLabelText="Search" value={search} onChange={this.handleSearchChange}/>
              </div>
            </div>
            <div style={{overflow: 'auto'}}>
              <List>
                {
                  _map(groups, (group) => {
                    let {id, name, properties} = group;
                    let subItems = _map(properties, (prop) => {
                      let {name, description, id,  icon} = prop;
                      return (`${name}#${(description || '')}`).toLowerCase().indexOf(search.toLowerCase()) > -1 ? (
                        <ListItem className={classNames({picked: !_includes(picked, id)})}
                          key={id}
                          primaryText={<div><Highlight search={search}>{name}</Highlight></div>}
                          secondaryText={<div><Highlight search={search}>{description}</Highlight></div>}
                          leftIcon={<div><Icon fixedWidth={true} name={icon} /></div>}
                          onClick={() => this.handleAdd(id)}
                        />) : null;
                    }
                    );
                    return _filter(subItems, (i) => i).length > 0 ? (
                      <ListItem primaryText={name}
                        key={id}
                        initiallyOpen={true}
                        //leftIcon={<div><Icon fixedWidth={true} name="plus"/></div>}
                        onClick={() => this.handleAddAll(id)}
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
              <div className="header">{picked.length ? picked.length : 'No'} Column{picked.length != 1 ? 's' : null} Selected</div>
            </div>
            <div className="grow scroll-within">
              <List>
                {
                  _map(groups, (group) => {
                    let {id, name, properties} = group;
                    return ( _intersection(picked, _map(properties, 'id')).length > 0 ?
                      <ListItem primaryText={name}
                        key={id}
                        initiallyOpen={true}
                        onClick={() => this.handleRemoveAll(id)}
                        nestedItems={
                          _map(properties, (prop) => {
                            let {name, description, id, icon} = prop;
                            return _includes(picked, id) ? (
                              <ListItem key={id}
                                secondaryText={description}
                                primaryText={name}
                                leftIcon={<div><Icon fixedWidth={true} name={icon}/></div>}
                                onClick={() => this.handleRemove(id)}/>
                            ) : null;
                          }
                          )
                        }
                      /> : null
                    );
                  })
                }

              </List>
            </div>
            <div className="centering-container">
              <RaisedButton label="Use" primary={true} onClick={this.handlePick}/>
            </div>
          </div>
        </div>
      </div>
    );
  },
});

export default GroupedItemPicker;
