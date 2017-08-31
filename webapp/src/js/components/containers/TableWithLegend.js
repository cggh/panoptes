import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import SQL from 'panoptes/SQL';
import DataTableView from 'panoptes/DataTableView';
import Card from 'material-ui/Card';

let TableWithLegend = createReactClass({
  displayName: 'TableWithLegend',
  mixins: [FluxMixin, ConfigMixin],

  propTypes: {
    table: PropTypes.string,
    query: PropTypes.string,
    order: PropTypes.array,
    columns: PropTypes.array,
    columnWidths: PropTypes.object,
    children: PropTypes.node
  },

  getInitialState() {
    return {};
  },

  getDefinedQuery(query, table) {
    return (query || this.props.query) ||
      ((table || this.props.table) ? this.config.tablesById[table || this.props.table].defaultQuery : null) ||
      SQL.nullQuery;
  },

  handleOrderChange(order) {
    this.setState({order});
  },

  render() {
    let {table, query, order, columns, columnWidths, children} = this.props;
    order = this.state.order || order;
    query = this.getDefinedQuery(query, table);

    return (
      <div className="vertical stack">
        <div className="centering-container">
          <Card style={{width: '500px'}}>{children}</Card>
        </div>
        <div className="centering-container grow">
          <div style={{width: '80%', height: '100%'}}>
            <DataTableView table={table}
              query={query}
              order={order}
              columns={columns}
              columnWidths={columnWidths}
              onColumnResize={this.handleColumnResize}
              onOrderChange={this.handleOrderChange}
            />
          </div>
        </div>
      </div>
    );
  },
});

export default TableWithLegend;
