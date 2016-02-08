import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

import SQL from 'panoptes/SQL';

import RaisedButton from 'material-ui/lib/raised-button';
import IconButton from 'material-ui/lib/icon-button';
import List from 'material-ui/lib/lists/list';
import ListItem from 'material-ui/lib/lists/list-item';
import Divider from 'material-ui/lib/divider';

import QueryString from 'panoptes/QueryString';
import QueryEditor from 'panoptes/QueryEditor';
import Sidebar from 'react-sidebar';


let QueryPicker = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    StoreWatchMixin('PanoptesStore')],

  propTypes: {
    table: React.PropTypes.string.isRequired,
    onPick: React.PropTypes.func.isRequired,
    initialQuery: React.PropTypes.string
  },

  getStateFromFlux() {
    return {
      defaultQuery: this.getFlux().store('PanoptesStore').getDefaultQueryFor(this.props.table),
      lastQuery: this.getFlux().store('PanoptesStore').getLastQueryFor(this.props.table)
    };
  },

  getInitialState() {
    return {
      query: SQL.WhereClause.encode(SQL.WhereClause.Trivial())
    };
  },

  componentWillMount() {
    this.config = this.config.tables[this.props.table];
    if (this.props.initialQuery)
      this.setState({query: this.props.initialQuery});
    else {
      let defaultQuery = this.config.defaultQuery;
      if (defaultQuery && defaultQuery != '') {
        this.setState({query: defaultQuery});
      }
    }
  },

  icon() {
    return 'filter';
  },
  title() {
    return `Pick Filter for ${this.config.tableNamePlural}`;
  },

  handleEnter() {
    this.handlePick();
  },
  handlePick() {
    this.props.onPick(this.state.query);
  },
  handleQueryChange(newQuery) {
    this.setState({
      query: newQuery
    });
  },

  render() {
    let {query, lastQuery, defaultQuery} = this.state;
    let {table} = this.props;
    return (
      <div className="large-modal query-picker">
        <Sidebar
          docked={true}
          transitions={false}
          touch={false}
          sidebar={(
          <div>
            <List>
              <ListItem primaryText="Default"
                        secondaryText={<p className="list-string"><QueryString className="text" prepend="" table={table} query={defaultQuery}/></p>}
                        secondaryTextLines={2}
                        onClick={() => this.handleQueryChange(defaultQuery)}
                        onDoubleClick={() => {
                          this.handleQueryChange(defaultQuery);
                          this.handlePick();
                        }
                        }/>
              <Divider />
              <ListItem primaryText="Previous"
                        secondaryText={<p className="list-string"><QueryString className="text" prepend="" table={table} query={lastQuery}/></p>}
                        secondaryTextLines={2}
                        onClick={() => this.handleQueryChange(lastQuery)}
                        onDoubleClick={() => {
                          this.handleQueryChange(lastQuery);
                          this.handlePick();
                        }
                        }/>
              <Divider />
            </List>
            <List  subheader="Stored Filters">
              <ListItem primaryText="Blue widgets"
                        secondaryText={<p className="list-string"><QueryString className="text" prepend="" table={table} query={query}/></p>}
                        secondaryTextLines={2}
                        rightIconButton={<IconButton tooltip="Replace" iconClassName="fa fa-times"/>}                        />
              <ListItem primaryText="Yellow birds"
                        secondaryText={<p className="list-string"><QueryString className="text" prepend="" table={table} query={query}/></p>}
                        secondaryTextLines={2}
                        rightIconButton={<IconButton tooltip="Replace" iconClassName="fa fa-times"/>}                        />
            </List>
          </div>
        )}>
        <div className="vertical stack">
          <div className="grow scroll-within query-editor-container">
            <QueryEditor table={table} query={query} onChange={this.handleQueryChange}/>
          </div>
          <div className="centering-container">
            <QueryString className="text" prepend="" table={table} query={query}/>
          </div>
          <div className="centering-container">
            <RaisedButton label="Set as Default"
                          onClick={this.handlePick}/>
            <RaisedButton label="Store"
                          onClick={this.handlePick}/>
            <RaisedButton label="Use"
                          primary={true}
                          onClick={this.handlePick}/>

          </div>
        </div>
        </Sidebar>


      </div>
    );
  }

});

module.exports = QueryPicker;


