import _reduce from 'lodash/reduce';
import _uniq from 'lodash/uniq';
import _values from 'lodash/values';

import {propertyColour} from 'util/Colours';

export const plotTypes = {
  bar: {
    displayName: 'Bar',
    dimensions: ['horizontal', 'vertical'],
    plotlyTraces: (data) => [{
      x: data.horizontal,
      y: data.vertical,
      type: 'bar'
    }]
  },
  histogram: {
    displayName: 'Histogram',
    dimensions: ['horizontal'],
    plotlyTraces: (data) => [{
      x: data.horizontal,
      type: 'histogram'
    }]
  },
  'twoDimensonalHistogram': {
    displayName: '2D Histogram',
    dimensions: ['horizontal', 'vertical'],
    plotlyTraces: (data) => [{
      x: data.horizontal,
      y: data.vertical,
      type: 'histogram2d'
    }]
  },
  //stackedHistogram: {
  //  displayName: 'Stacked Histogram',
  //  dimensions: ['horizontal', 'vertical']
  //},
  box: {
    displayName: 'Box and Whisker',
    dimensions: ['horizontal', 'vertical'],
    plotlyTraces: (data) => [{
      x: data.horizontal,
      y: data.vertical,
      type: 'box'
    }]
  },
  scatter: {
    displayName: 'Scatter',
    dimensions: ['horizontal', 'vertical', 'colour'],
    layout: {showlegend: true, legend: {orientation: 'h'}},
    plotlyTraces: (data, metadata) => {

console.log('plotlyTraces data: %o', data);
console.log('plotlyTraces metadata: %o', metadata);


      // The data object contains an array of values for each dimension.
      // The arrays are parallel, i.e. elements are in one-to-one correspondence.
      // e.g. data.horizontal might contain ["Pf3D7_01_v3", "Pf3D7_01_v3", ...]
      // data.vertical might contain [1, 10, ...]
      // data.colour might contain ["A", "B", ...]
      // representing tuples [("Pf3D7_01_v3", 1, "A"), ("Pf3D7_01_v3", 10, "B"), ...]


      // If the dimension is color, and there is a value for the dim,
      // and the dim is not numerical and is categorical
      // if (dim == 'colour' && state[dim] && !prop.isNumerical && prop.isCategorical) {

      // To get the corresponding colour, need the property and
      // _map(state[dim], propertyColour(prop));


      // OLD
      // data.colour might contain ["#388E3C", "#388E3C", ...]
      // representing tuples [("Pf3D7_01_v3", 1, "#388E3C"), ("Pf3D7_01_v3", 10, "#388E3C"), ...]




      // TODO: Need the values that each colour represents, e.g. #388E3C = High Quality true

      // Should pass colours through as the values and translate on this side.

      // Also what the name of the colour dimension (and other dimensions?) so that the plot makes sense out of context.
      // e.g. High Quality: [green] true    [red] false
      // Extra 1:

      let traces = {};

      if (data.horizontal || data.vertical) {

        for (let i = 0, end = (data.horizontal || data.vertical).length; i < end; ++i) {


          /* When no colour dimension has been selected, the markers shoud use the default (but this is currently set to black) */

          let colour = data.colour ? data.colour[i] : 'rgb(0,0,0)';

          let symbol = data.symbol ? data.symbol[i] : 'circle';
          let line = data.line ? data.line[i] : {color: 'rgba(217, 217, 217, 1.0)', width: 1};
          let marker = data.marker ? data.marker[i] : {
            color: colour,
            line: line,
            symbol: symbol,
            size: 16
          };
          if (!traces[colour]) {
            traces[colour] = {
              x: [],
              y: [],
              marker: {
                color: colour,
                line: line,
                symbol: symbol,
                size: 16
              },
              type: 'scatter',
              mode: 'markers',
              name: 'test ' + colour
            };
          }
          if (data.horizontal)
            traces[colour].x.push(data.horizontal[i]);
          if (data.vertical)
            traces[colour].y.push(data.vertical[i]);
        }
      }

      // Return the data arrays for each trace.
      return _values(traces);
    }
  }
};

export const allDimensions = _uniq(_reduce(plotTypes, (dims, plot) => dims.concat(plot.dimensions), []));
