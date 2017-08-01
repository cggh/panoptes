import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import LegendElement from 'panoptes/LegendElement';

let ColoursLegend = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    colours: React.PropTypes.object.isRequired,
    maxLegendItems: React.PropTypes.number
  },

  render() {
    let {colours, maxLegendItems} = this.props;

    let legendElements = Object.keys(colours).sort().map(
      (colour) =>
      <LegendElement key={colour} name={colours[colour].name} colour={colour} />
    );

    return <div className="legend">
    {maxLegendItems === undefined || (maxLegendItems !== undefined && legendElements.length < maxLegendItems) ?
      legendElements
    : legendElements.slice(0, maxLegendItems).concat([<div key="more" className="legend-element">+{legendElements.length - maxLegendItems} more</div>])
    }
    </div>;
  }
});

export default ColoursLegend;
