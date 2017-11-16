import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import SQL from 'panoptes/SQL';
import MuiDataTableView from 'panoptes/MuiDataTableView';
import Card, {CardContent} from 'material-ui/Card';
import {withStyles} from 'material-ui/styles';

const styles = (theme) => ({
  card: {
    maxWidth: 650,
  },
});

let TableWithLegend = createReactClass({
  displayName: 'TableWithLegend',
  mixins: [FluxMixin, ConfigMixin],

  propTypes: {
    table: PropTypes.string,
    query: PropTypes.string,
    order: PropTypes.array,
    columns: PropTypes.array,
    columnWidths: PropTypes.object,
    children: PropTypes.node,
    classes: PropTypes.object,
    disableMultipleColumnOrder: PropTypes.bool,
    maxRowsPerPage: PropTypes.number
  },

  getDefaultProps() {
    return {
      disableMultipleColumnOrder: false
    };
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
    if (this.props.disableMultipleColumnOrder && order !== undefined && order.length > 1) {
      // Using slice instead of splice because we need a new array to trigger state change.
      let newOrder = order.slice(order.length - 1, order.length);
      order = newOrder;
    }
    this.setState({order});
  },

  render() {
    let {table, query, order, columns, children, classes, maxRowsPerPage} = this.props;
    order = this.state.order || order;
    query = this.getDefinedQuery(query, table);

    return (
      <div className="centering-container">
        <Card className={classes.card}>
          <CardContent>
            {children}
            <MuiDataTableView
              table={table}
              query={query}
              order={order}
              columns={columns}
              onOrderChange={this.handleOrderChange}
              maxRowsPerPage={maxRowsPerPage}
            />
          </CardContent>
        </Card>
      </div>
    );
  },
});

let module = withStyles(styles)(TableWithLegend);
module.displayName = 'TableWithLegend';
module.propTypes = TableWithLegend.propTypes;
export default module;
