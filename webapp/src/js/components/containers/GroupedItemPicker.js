import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import PureRenderMixin from 'mixins/PureRenderMixin';
import classNames from 'classnames';
import Highlight from 'react-highlighter';

import TextField from '@material-ui/core/TextField';
import Button from 'ui/Button';
import {List, ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction} from '@material-ui/core';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import DeleteIcon from '@material-ui/icons/Delete';
import PlaylistAddIcon from '@material-ui/icons/PlaylistAdd';
import _map from 'lodash.map';
import _includes from 'lodash.includes';
import _intersection from 'lodash.intersection';
import _union from 'lodash.union';
import _without from 'lodash.without';
import _forEach from 'lodash.foreach';
import _sumBy from 'lodash.sumby';
import _filter from 'lodash.filter';
import _difference from 'lodash.difference';
import _clone from 'lodash.clone';
import Icon from 'ui/Icon';
import IconButton from '@material-ui/core/IconButton';

const defaultAvailableExpanded = true;
const defaultPickedExpanded = true;

let GroupedItemPicker = createReactClass({
  displayName: 'GroupedItemPicker',

  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    groups: PropTypes.objectOf(PropTypes.object),
    initialPick: PropTypes.arrayOf(PropTypes.string),
    onPick: PropTypes.func,
    title: PropTypes.string,
    classes: PropTypes.object
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
      search: '',
      availableExpanded: {},
      pickedExpanded: {}
    };
  },

  icon() {
    return 'check-square-o';
  },

  title() {
    return this.props.title;
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

  handleToggleAvailableExpand(id) {
    let availableExpanded = _clone(this.state.availableExpanded);
    availableExpanded[id] = availableExpanded[id] === undefined ? availableExpanded[id] = !defaultAvailableExpanded : availableExpanded[id] = !availableExpanded[id];
    this.setState({'availableExpanded': availableExpanded});
  },

  isAvailableExpanded(id) {
    return this.state.availableExpanded[id] === undefined ? defaultAvailableExpanded : this.state.availableExpanded[id];
  },

  handleTogglePickedExpand(id) {
    let pickedExpanded = _clone(this.state.pickedExpanded);
    pickedExpanded[id] = pickedExpanded[id] === undefined ? pickedExpanded[id] = !defaultPickedExpanded : pickedExpanded[id] = !pickedExpanded[id];
    this.setState({'pickedExpanded': pickedExpanded});
  },

  isPickedExpanded(id) {
    return this.state.pickedExpanded[id] === undefined ? defaultPickedExpanded : this.state.pickedExpanded[id];
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
              <div className="header">{count} Column{count != 1 ? 's' : null} Available (click to add/remove)</div>
              <div className="search">
                <TextField autoFocus label="Search" value={search} onChange={this.handleSearchChange}/>
              </div>
            </div>
            <div style={{overflow: 'auto'}}>
              <List>
                {
                  _map(groups, (group) => {
                    let {id, name, properties} = group;
                    let subItems = _map(properties, (prop) => {
                      let {name, description, id,  icon} = prop;
                      return (`${name}#${(description || '')}`).toLowerCase().indexOf(search.toLowerCase()) > -1 ?
                        (
                          <ListItem
                            button
                            className={['nested', classNames({'not-picked': _includes(picked, id)})]}
                            key={id}
                            onClick={() => this.handleAdd(id)}
                          >
                            <ListItemIcon>
                              <Icon fixedWidth={true} name={icon} />
                            </ListItemIcon>
                            <ListItemText
                              inset
                              primary={<Highlight search={search}>{name}</Highlight>}
                              secondary={<Highlight search={search}>{description}</Highlight>}
                            />
                          </ListItem>
                        ) : null;
                    }
                    );
                    return _filter(subItems, (i) => i).length > 0 ?
                      (
                        <div>
                          <ListItem
                            button
                            key={id}
                          >
                            <ListItemText
                              primary={name}
                              onClick={() => this.handleToggleAvailableExpand(id)}
                            />
                            {this.isAvailableExpanded(id) ?
                              <ExpandMore onClick={() => this.handleToggleAvailableExpand(id)} />
                              : <ExpandLess onClick={() => this.handleToggleAvailableExpand(id)} />
                            }
                            <span style={{marginLeft: '50px'}}>
                              <ListItemSecondaryAction>
                                <IconButton
                                  aria-label="Add group"
                                  title="Add group"
                                  onClick={() => this.handleAddAll(id)}
                                >
                                  <PlaylistAddIcon />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </span>
                          </ListItem>
                          <Collapse in={this.isAvailableExpanded(id)} >
                            {subItems}
                          </Collapse>
                        </div>
                      ) : null;
                  })
                }
              </List>
            </div>
          </div>
          <div className="grow stack vertical">
            <div>
              <div className="header">{picked.length ? picked.length : 'No'} Column{picked.length != 1 ? 's' : null} Selected (click to remove)</div>
            </div>
            <div className="grow scroll-within">
              <List>
                {
                  _map(groups, (group) => {
                    let {id, name, properties} = group;
                    // Note: onClick on ListItem would confuse the SecondaryAction.
                    return ( _intersection(picked, _map(properties, 'id')).length > 0 ?
                      <div>
                        <ListItem
                          button
                          key={id}
                        >
                          <ListItemText
                            primary={name}
                            onClick={() => this.handleTogglePickedExpand(id)}
                          />
                          {this.isPickedExpanded(id) ?
                            <ExpandMore onClick={() => this.handleTogglePickedExpand(id)} />
                            : <ExpandLess onClick={() => this.handleTogglePickedExpand(id)} />
                          }
                          <span style={{marginLeft: '50px'}}>
                            <ListItemSecondaryAction>
                              <IconButton
                                aria-label="Remove group"
                                title="Remove group"
                                onClick={() => this.handleRemoveAll(id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </span>
                        </ListItem>
                        <Collapse in={this.isPickedExpanded(id)} >
                          {
                            _map(properties, (prop) => {
                              let {name, description, id, icon} = prop;
                              return _includes(picked, id) ? (
                                <ListItem
                                  button
                                  key={id}
                                  onClick={() => this.handleRemove(id)}
                                  className="nested"
                                >
                                  <ListItemIcon>
                                    <Icon fixedWidth={true} name={icon} />
                                  </ListItemIcon>
                                  <ListItemText
                                    inset
                                    primary={name}
                                    secondary={description}
                                  />
                                </ListItem>
                              ) : null;
                            })
                          }
                        </Collapse>
                      </div>
                      : null
                    );
                  })
                }
              </List>
            </div>
            <div className="centering-container">
              <Button raised="true" label="Use" color="primary" onClick={this.handlePick}/>
            </div>
          </div>
        </div>
      </div>
    );
  },
});

export default GroupedItemPicker;
