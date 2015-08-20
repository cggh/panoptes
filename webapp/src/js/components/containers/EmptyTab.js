const _ = require('lodash');
const React = require('react');

const PureRenderMixin = require('mixins/PureRenderMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const FluxMixin = require('mixins/FluxMixin');

const {RaisedButton, IconButton, List, ListItem, ListDivider, FontIcon} = require('material-ui');
const Icon = require("ui/Icon");

let EmptyTab = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired
  },

  icon() {
    return 'folder-o';
  },
  title() {
    return `New tab`;
  },

  handleClick(e, table) {
    let actions = this.getFlux().actions.session;
    if (e.button == 1 || e.metaKey || e.ctrlKey)
      actions.tabOpen('containers/DataTableWithQuery', {table:table.id}, false);
    else {
      this.props.componentUpdate({table: table.id}, 'containers/DataTableWithQuery');
    }
  },

  render() {
    let {tables} = this.config;
    return (
      <div className="centering-container">
        <List subheader="Open a table:">
          {_.map(tables, (table) => (
            <ListItem key={table.id}
                      secondaryText={table.description}
                      leftIcon={<div><Icon fixedWidth={true} name={table.icon}/></div>}
                      onClick={(e) => this.handleClick(e, table)}
              >
              {table.tableCapNamePlural}
            </ListItem>

          ))}
        </List>
      </div>

    );
  }
});

module.exports = EmptyTab;
