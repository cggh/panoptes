import PropTypes from 'prop-types';
import React from 'react';

import createPlotlyComponent from 'react-plotlyjs';
import Plotly from 'plotly.js/dist/plotly-cartesian';
const PlotlyComponent = createPlotlyComponent(Plotly);

import createReactClass from 'create-react-class';
import withAPIData from 'hoc/withAPIData';
import FluxMixin from 'mixins/FluxMixin';
import SQL from 'panoptes/SQL';
import {Card, CardText} from 'material-ui/Card';

let ResistanceTimePlot = createReactClass({
  displayName: 'ResistanceTimePlot',

  mixins: [
    FluxMixin,
  ],

  propTypes: {
    query: PropTypes.string,
    table: PropTypes.string.isRequired,
    drugColumns: PropTypes.array,
    yearColumn: PropTypes.string
  },

  getDefaultProps() {
    return {
      query: SQL.nullQuery,
    };
  },

  render() {
    let {data, table, drugColumns, yearColumn, children, config} = this.props;
    let tableConfig = config.tablesById[table];

    const layout = {
      barmode: 'overlay',
      autosize: true,
      // width,
      // height,
      showlegend: false,
      xaxis: {title: 'Year'},
      yaxis: {title: 'Frequency'},
    };

    const plotConfig = {
      showLink: false,
      displayModeBar: true
    };

    console.log(data);
    return (
      <div className="vertical stack">
        <div className="centering-container">
          <Card style={{width: '500px'}}>{children}</Card>
        </div>
        <div className="centering-container grow">
          <div style={{width: '815px', height: '100%'}}>
            <PlotlyComponent
              className="plot"
              data={[{
                x: [1, 2, 3, 4],
                y: [10, 15, 13, 17],
                type: 'scatter'
              }]}
              layout={layout}
              config={plotConfig}
            />
          </div>
        </div>
      </div>
    );
  }
});

ResistanceTimePlot = withAPIData(ResistanceTimePlot, ({config, props}) => {
  let {drugColumns, query, table, yearColumn} = props;
  let tableConfig = config.tablesById[table];
  let groupBy = [yearColumn];
  groupBy = groupBy.concat(drugColumns);
  let columns = [{expr: ['count', ['*']], as: 'count'}];
  columns = columns.concat(groupBy);
  return {
    data: {
      method: 'query',
      args: {
        database: config.dataset,
        table: table,
        columns,
        query,
        groupBy,
        transpose: false,
      }
    }
  };
});

export default ResistanceTimePlot;

