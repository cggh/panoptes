import _reduce from 'lodash/reduce';
import _uniq from 'lodash/uniq';

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
    plotlyTraces: (data) => [{
      x: data.horizontal,
      y: data.vertical,
      marker: {
        color: data.colour
      },
      type: 'scatter',
      mode: 'markers'
    }]
  }
};

export const allDimensions = _uniq(_reduce(plotTypes, (dims, plot) => dims.concat(plot.dimensions), []));
