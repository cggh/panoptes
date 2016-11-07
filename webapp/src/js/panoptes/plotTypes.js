import _reduce from 'lodash/reduce';
import _uniq from 'lodash/uniq';
import _values from 'lodash/values';



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

      // NB: A different default marker could be specified here.
      let defaultMarker = {};

      // let defaultMarker = {
      //   color: 'rgb(0,0,0)',
      //   line: {color: 'rgba(217, 217, 217, 1.0)', width: 1},
      //   symbol: 'circle',
      //   size: 16
      // };

      // If there are no data for a colour dimension,
      // then just return one trace using the horizontal and vertical.
      if (!data.colour) {
        return [{
          x: data.horizontal,
          y: data.vertical,
          marker: defaultMarker,
          type: 'scatter',
          mode: 'markers'
        }];
      }

      // We now know we have data.colour.

      // If we don't have a horizontal or vertical dimension, bail out.
      // FIXME: Can a scatter can be plotted with just one dimension + colour?
      if (!data.horizontal && !data.vertical) {
        return [];
      }

      // We know whe have data.colour and a horizontal/vertical dimension.

      // Compose a separate trace object for each unique colour dimension value,
      // keyed on the colour dimension value, e.g. {'A': {}, 'B': {}, ...}
      // NB: The colour dimension value is not given to plotly, only used here as a key.
      // NB: The corresponding colour for the value will be determined by metadata.colourFunction
      // and provided in the trace object, e.g. {A: {color: metadata.colourFunction('A'), ...}, ...}

      let colourTraces = {};

      // For each data point...
      for (let i = 0, end = (data.horizontal || data.vertical).length; i < end; ++i) {

        // OLD logic, to determine whether we can convert the value to a colour?
        // If the dimension is colour, and there are a set of values for the dimension,
        // and the dimension is not numerical and is categorical
        // if (dim == 'colour' && state[dim] && !prop.isNumerical && prop.isCategorical) {

        let colour = data.colour[i];
        let formattedColourName = metadata.colour.formatterFunction(colour);
        let legendColourName = formattedColourName !== '' ? formattedColourName : 'NULL';

        // If the trace for this colour has not yet been defined...
        if (!colourTraces[colour]) {
          colourTraces[colour] = {
            x: [],
            y: [],
            marker: defaultMarker,
            type: 'scatter',
            mode: 'markers',
            name: legendColourName,
            color: metadata.colour.colourFunction(colour)
          };
        }

        // If data for the horizontal dimension has been provided,
        // then add this datum to the relevant dimension for this colour trace.
        if (data.horizontal) {
          colourTraces[colour].x.push(data.horizontal[i]);
        }

        if (data.vertical) {
          colourTraces[colour].y.push(data.vertical[i]);
        }

      }

      // Return the data arrays for each colour trace.
      return _values(colourTraces);
    }
  }
};

export const allDimensions = _uniq(_reduce(plotTypes, (dims, plot) => dims.concat(plot.dimensions), []));
