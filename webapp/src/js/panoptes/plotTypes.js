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
    plotlyTraces: (data) => {
      let traces = {};
      if (data.horizontal || data.vertical) {
        for (let i = 0, end = (data.horizontal || data.vertical).length; i < end; ++i) {
          let colour = data.colour ? data.colour[i] : 'rgb(0,0,0)';
          let symbol = data.symbol ? data.symbol[i] : 'circle';
          let line = data.line ? data.line[i] : {color: 'rgba(217, 217, 217, 1.0)', width: 1};
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
      return _values(traces);
    }
  }
};

export const allDimensions = _uniq(_reduce(plotTypes, (dims, plot) => dims.concat(plot.dimensions), []));
