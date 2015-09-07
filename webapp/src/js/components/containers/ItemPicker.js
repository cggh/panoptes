const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const classNames = require('classnames');

const {RaisedButton, List, Paper, ListItem} = require('material-ui');

import mui from 'material-ui';
const ThemeManager = new mui.Styles.ThemeManager();

let ItemPicker = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    groups: ImmutablePropTypes.mapOf(ImmutablePropTypes.map),
    initialPick: ImmutablePropTypes.listOf(React.PropTypes.string),
    onPick: React.PropTypes.func,
    title: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      groups: Immutable.Map(),
      initialPick: Immutable.List(),
      title: "Pick items"
    }
  },

  getInitialState() {
    return {
      picked: this.props.initialPick.toSet()
    }
  },

  componentWillMount() {
  },

  icon() {
    return 'check-square-o';
  },
  title() {
    return this.props.title;
  },

  handleAdd(propId) {
    if (this.state.picked.has(propId))
      this.setState({picked: this.state.picked.delete(propId)});
    else
      this.setState({picked: this.state.picked.add(propId)});
  },
  handleAddAll(groupId) {
    let toAdd = this.props.groups.getIn([groupId, 'properties']).map((prop) => prop.get('propid'));
    this.setState({picked: this.state.picked.union(toAdd)});
  },
  handleRemove(propId) {
    this.setState({picked: this.state.picked.delete(propId)});
  },
  handleRemoveAll(groupId) {
    let toRemove = this.props.groups.getIn([groupId, 'properties']).map((prop) => prop.get('propid'));
    this.setState({picked: this.state.picked.subtract(toRemove)});
  },

  handlePick() {
    this.props.onPick(this.state.picked.toList());
  },

  render() {
    let {picked, groupOpen} = this.state;
    let {groups} = this.props;
    //"toJS" needed due to https://github.com/facebook/immutable-js/issues/554
    return (
      <div className='large-modal item-picker'>
        <div className="horizontal stack">
          <div className="grow scroll-within">
            <div className="header">Available</div>
            <List>
              {
                _.map(groups.toJS(), (group) => {
                  let {id, name, properties} = group;
                  return (
                    <ListItem primaryText={name}
                              key={id}
                              initiallyOpen={true}
                              onClick={() => this.handleAddAll(id)}
                              nestedItems={
                      _.map(properties, (prop) => {
                          let {name, description, propid} = prop;
                          return (
                            <ListItem className={classNames({picked:picked.includes(propid)})}
                                      key={propid}
                                      primaryText={name}
                                      secondaryText={description}
                                      onClick={() => this.handleAdd(propid)}
                                      />
                          );
                        }
                      )
                    }
                      />

                  )
                })
              }
            </List>
          </div>
          <div className="grow stack vertical">
            <div className="grow scroll-within">
              <div className="header">Selected</div>
              { picked.size > 0 ?
                <List>
                  {
                    _.map(groups.toJS(), (group) => {
                      let {id, name, properties} = group;
                      return ( picked.intersect(_.map(properties, (prop) => prop.propid)).size > 0 ?
                          <ListItem primaryText={name}
                                    key={id}
                                    initiallyOpen={true}
                                    onClick={() => this.handleRemoveAll(id)}
                                    nestedItems={
                        _.map(properties, (prop) => {
                            let {name, description, propid} = prop;
                            return picked.includes(propid) ? (
                              <ListItem key={propid}
                                        secondaryText={description}
                                        primaryText={name}
                                        onClick={() => this.handleRemove(propid)}/>
                            ) : null;
                          }
                        )
                      }
                            /> : null
                      )
                    })
                  }

                </List>
                : <div className="centering-container status-text">No columns selected</div>}
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
