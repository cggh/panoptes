const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');
const LinkedStateMixin = require('react-addons-linked-state-mixin');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');
const classNames = require('classnames');
const Highlight = require('react-highlighter');

const {TextField, RaisedButton, List, Paper, ListItem} = require('material-ui');

const Icon = require('ui/Icon');


let ItemPicker = React.createClass({
  mixins: [
    PureRenderMixin,
    LinkedStateMixin
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
      title: 'Pick items'
    };
  },

  getInitialState() {
    return {
      picked: this.props.initialPick.toSet(),
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
    let result = Immutable.List();
    this.props.groups.forEach((group) => {
      group.get('properties').forEach((prop) => {
        if (this.state.picked.has(prop.get('propid'))) {
            result = result.push(prop.get('propid'));
          }
      });
    }
    );
    this.props.onPick(result);
  },

  render() {
    let {picked, groupOpen, search} = this.state;
    let {groups} = this.props;
    let count = groups.map((group) => group.get('properties').size).reduce((sum, v) => sum + v, 0);
    //"toJS" needed due to https://github.com/facebook/immutable-js/issues/554
    return (
      <div className='large-modal item-picker'>
        <div className="horizontal stack">
          <div className="grow scroll-within">
            <div className="header">{count} Column{count != 1 ? 's' : null} Available</div>
            <div className="search">
              <TextField floatingLabelText="Search" valueLink={this.linkState('search')}/>
              </div>
            <List>
              {
                _.map(groups.toJS(), (group) => {
                  let {id, name, properties} = group;
                  let subItems = _.map(properties, (prop) => {
                    let {name, description, propid} = prop;
                    return (name + '#' + description).toLowerCase().indexOf(search.toLowerCase()) > -1 ? (
                          <ListItem className={classNames({picked:picked.includes(propid)})}
                                    key={propid}
                                    primaryText={<div><Highlight search={search}>{name}</Highlight></div>}
                                    secondaryText={<div><Highlight search={search}>{description}</Highlight></div>}
                                    leftIcon={<div><Icon fixedWidth={true} name={picked.includes(propid) ? 'minus' : 'plus'} /></div>}
                                    onClick={() => this.handleAdd(propid)}
                            />) : null;
                  }
                    );
                  return _.filter(subItems).length > 0 ? (
                    <ListItem primaryText={name}
                              key={id}
                              initiallyOpen={true}
                              leftIcon={<div><Icon fixedWidth={true} name="plus"/></div>}
                              onClick={() => this.handleAddAll(id)}
                              nestedItems={subItems}
                      />

                  ) : null;
                })
              }
            </List>
          </div>
          <div className="grow stack vertical">
            <div className="grow scroll-within">
              <div className="header">{picked.size ? picked.size : 'No'} Column{picked.size != 1 ? 's' : null} Selected</div>
                <List>
                  {
                    _.map(groups.toJS(), (group) => {
                      let {id, name, properties} = group;
                      return ( picked.intersect(_.map(properties, (prop) => prop.propid)).size > 0 ?
                          <ListItem primaryText={name}
                                    key={id}
                                    initiallyOpen={true}
                                    leftIcon={<div><Icon fixedWidth={true} name="minus"/></div>}
                                    onClick={() => this.handleRemoveAll(id)}
                                    nestedItems={
                        _.map(properties, (prop) => {
                          let {name, description, propid} = prop;
                          return picked.includes(propid) ? (
                              <ListItem key={propid}
                                        secondaryText={description}
                                        primaryText={name}
                                        leftIcon={<div><Icon fixedWidth={true} name="minus"/></div>}
                                        onClick={() => this.handleRemove(propid)}/>
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
