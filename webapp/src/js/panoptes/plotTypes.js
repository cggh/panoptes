import _reduce from 'lodash/reduce';
import _uniq from 'lodash/uniq';
import _values from 'lodash/values';
import _map from 'lodash/map';

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

      // The data object contains an array of values for each dimension.
      // The arrays are parallel, i.e. elements are in one-to-one correspondence.
      // e.g. data.horizontal might contain ["Pf3D7_01_v3", "Pf3D7_01_v3", ...]
      // data.vertical might contain [1, 10, ...]
      // data.colour might contain ["A", "B", ...]
      // representing tuples [("Pf3D7_01_v3", 1, "A"), ("Pf3D7_01_v3", 10, "B"), ...]
      // NB: The data.colour values need to be converted to corresponding colours.

      // The metadata object contains an object for each dimension.
      // e.g. metadata.colour might contain {id: "Extra_1", ...}

      // If there are no data for a colour dimension,
      // then just return one trace using the horizontal and vertical.
      if (!data.colour) {
        return [{
          x: data.horizontal,
          y: data.vertical,
          marker: {},
          type: 'scatter',
          mode: 'markers'
        }];
      }

      //A valid graph must have one of vertical or horizontal
      if (!data.horizontal && !data.vertical) {
        return [];
      }

      // We have colour dimension data and a horizontal/vertical dimension.

      // If the colour dimension data is numerical and non-categorical,
      // then provide those data for marker colours and show the scale.
      // NB: data.colour can contain NaN and null values
      if (metadata.colour.isNumerical && !metadata.colour.isCategorical) {
        return [{
          x: data.horizontal,
          y: data.vertical,
          marker: {
            color: _map(data.colour, (colour) => isNaN(colour) ? 0 : metadata.colour.colourFunction(colour)),
            //colorscale: _map(_uniq(data.colour).sort(), (colour) => isNaN(colour) ? [0, metadata.colour.colourFunction(colour)] : [colour, metadata.colour.colourFunction(colour)]),
            autocolorscale: true,
            showscale: true
          },
          type: 'scatter',
          mode: 'markers'
        }];
      }

      // The colour dimension data is either categorical or non-numerical

      // Compose a separate trace object for each unique colour dimension value,
      // keyed on the colour dimension value, e.g. {'A': {}, 'B': {}, ...}
      // NB: The colour dimension value is not given to plotly, only used here as a key.

      let colourTraces = {};

      // For each data point...
      for (let i = 0, end = (data.horizontal || data.vertical).length; i < end; ++i) {

        let colour = data.colour[i];
        let formattedColourName = metadata.colour.formatterFunction(colour);
        let legendColourName = formattedColourName !== '' ? formattedColourName : 'NULL';

        // If the trace for this colour has not yet been defined...
        if (!colourTraces[colour]) {
          colourTraces[colour] = {
            x: [],
            y: [],
            marker: {color: metadata.colour.colourFunction(colour)},
            type: 'scatter',
            mode: 'markers',
            name: legendColourName
          };
        }

        // If data for the horizontal dimension has been provided,
        // then add this datum to the relevant dimension for this colour trace.
        if (data.horizontal) {
          colourTraces[colour].x.push(data.horizontal[i]);
        } else {
          colourTraces[colour].x.push(i);
        }
        if (data.vertical) {
          colourTraces[colour].y.push(data.vertical[i]);
        } else {
          colourTraces[colour].y.push(i);
        }

      }

      // Return the colourTrace objects as array elements.
      return _values(colourTraces);
    }
  }
};

export const allDimensions = _uniq(_reduce(plotTypes, (dims, plot) => dims.concat(plot.dimensions), []));
