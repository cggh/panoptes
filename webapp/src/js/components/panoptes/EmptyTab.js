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
  },

  icon() {
    return 'folder-o';
  },
  title() {
    return `New tab`;
  },

  render() {
    let {tables} = this.config;
    let actions = this.getFlux().actions.layout;
    console.log(tables);
    return (
      <div className="centering-container">
        <List subheader="Open a table">
          {_.map(tables, (table) => (
            <ListItem secondaryText={table.description}
                      leftIcon={<Icon name={table.icon}/>}
                      onClick={() => actions.tabOpen(
                      'containers/DataTableWithQuery',
                       {table:table.id})}
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
