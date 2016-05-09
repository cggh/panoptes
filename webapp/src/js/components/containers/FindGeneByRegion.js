import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// lodash
import _throttle from 'lodash/throttle';
import _map from 'lodash/map';

// Panoptes
import RegionGenesList from 'panoptes/RegionGenesList';

let FindGeneByRegion = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    activeTab: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      chromosome: null,
      startPosition: 0,
      endPosition: null,
      chromosomeLength: null
    };
  },

  title() {
    return this.props.title;
  },

  componentDidMount() {
    this.handleChromChange = _throttle(this.handleChromChange, 500);
    this.handleStartPosChange = _throttle(this.handleStartPosChange, 500);
    this.handleEndPosChange = _throttle(this.handleEndPosChange, 500);
  },

  handleChromChange(event) {
    this.props.componentUpdate({
      'chromosome': event.target.value,
      'startPosition': 0,
      'endPosition': parseInt(this.config.chromosomes[event.target.value].len),
      'chromosomeLength': parseInt(this.config.chromosomes[event.target.value].len)
    });
  },

  handleStartPosChange(event) {
    if (event.target) {
      this.props.componentUpdate({'startPosition': event.target.value});
    }
  },

  handleEndPosChange(event) {
    if (event.target) {
      this.props.componentUpdate({'endPosition': event.target.value});
    }
  },

  handleSelectGene(e, geneId) {

    // Add selected geneId to list of recently found genes.
    this.getFlux().actions.session.geneFound(geneId);

    let container = 'containers/Gene';
    let props = {geneId: geneId};

    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;

    if (middleClick) {
      this.getFlux().actions.session.popupOpen(container, props, false);
    } else {
      this.props.componentUpdate(props, container);
    }

  },

  render() {

    let {chromosome, startPosition, endPosition, chromosomeLength} = this.props;

    let geneList = null;

    if (chromosome === null || startPosition === null || endPosition === null || startPosition === '' || endPosition === '' ) {

      geneList = (
        <div style={{padding: '10px'}}>
          <p>Select the chromosome and enter the start and end positions.</p>
        </div>
      );

    } else {

      geneList = (
        <RegionGenesList
          chromosome={chromosome}
          startPosition={parseInt(startPosition)}
          endPosition={parseInt(endPosition)}
          onSelectGene={this.handleSelectGene}
          icon="bitmap:genomebrowser.png"
        />
      );

    }

    // TODO: Lay out inputs horizontally and allow collapse; give sensible widths.

    return (
      <div>
        <table className="table-col">
        <tbody>
          <tr>
            <th className="table-col-header">Chromosome:</th>
            <td className="table-col-cell">
              <select value={chromosome} onChange={this.handleChromChange}>
                {_map(this.config.chromosomes, (length, name) =>
                    <option key={name}
                            value={name}>
                      {name}
                    </option>
                )}
              </select>
            </td>
          </tr>
          <tr>
            <th className="table-col-header">Start:</th>
            <td className="table-col-cell">
              <input value={startPosition}
                     onChange={this.handleStartPosChange}
                     min={0}
                     max={endPosition ? endPosition : chromosomeLength}
                     type="number"
              />
            </td>
            <td className="table-col-cell">bp</td>
          </tr>
          <tr>
            <th className="table-col-header">End:</th>
            <td className="table-col-cell">
              <input value={endPosition}
                     onChange={this.handleEndPosChange}
                     min={startPosition ? startPosition : 0}
                     max={chromosomeLength}
                     type="number"
              />
            </td>
            <td className="table-col-cell">bp</td>
          </tr>
        </tbody>
        </table>
        <div style={{position: 'relative', width: '100%', height: '200px'}}>
          {geneList}
        </div>
      </div>
    );

  }
});

module.exports = FindGeneByRegion;
