const _ = require('lodash');
const React = require('react');

const PureRenderMixin = require('mixins/PureRenderMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const FluxMixin = require('mixins/FluxMixin');

const {RaisedButton, List, ListItem, ListDivider, FontIcon} = require('material-ui');
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

  handleOpen(e, container, props) {
    let actions = this.getFlux().actions.session;
    if (e.button == 1 || e.metaKey || e.ctrlKey)
      actions.tabOpen(container, props, false);
    else {
      this.props.componentUpdate(props, container);
    }
  },

  handleTableClick(e, table) {
    this.handleOpen(e, 'containers/DataTableWithActions', {table:table.id});
  },

  render() {
    let {tables, chromosomes} = this.config;
    console.log(this.config)
    let actions = this.getFlux().actions.session;
    return (
      <div className="horizontal stack start-align">
        <List subheader="Open a table:">
          {_.map(tables, (table) => (
            <ListItem key={table.id}
                      primaryText={table.tableCapNamePlural}
                      secondaryText={table.description}
                      leftIcon={<div><Icon fixedWidth={true} name={table.icon}/></div>}
                      onClick={(e) => this.handleTableClick(e, table)} />
          ))}
        </List>
        <List subheader="Open a view:">
          <ListItem primaryText="Genome Browser"
                    secondaryText="View table data and sequence data on the genome"
                    leftIcon={<div><Icon fixedWidth={true} name="bitmap:genomebrowser.png"/></div>}
                    onClick={(e) => this.handleOpen(e, 'containers/GenomeBrowserWithActions', {chromosome:_.keys(chromosomes)[0]})} />
        </List>
      </div>
    );
  }
});

module.exports = EmptyTab;
