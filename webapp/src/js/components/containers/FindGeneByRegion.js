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

  title() {
    return this.props.title;
  },

  getInitialState() {
    return {
      chromosome: null,
      startPosition: 0,
      endPosition: null,
      chromosomeLength: null
    };
  },

  componentWillMount() {

    // Set the default chromosome as the first chromosome in this.config.chromosomes
    // NB: this.config is undefined in getInitialstate()

    let defaultChromosome = Object.keys(this.config.chromosomes)[0];

    if (this.state.chromosome === null && defaultChromosome !== null) {

      let defaultChromosomeLength = parseInt(this.config.chromosomes[defaultChromosome].len);

      this.setState({
        'chromosome': defaultChromosome,
        'chromosomeLength': defaultChromosomeLength
      });

      // Set the default endPosition as the chromosome length
      if (this.state.endPosition === null) {
        this.setState({'endPosition': defaultChromosomeLength});
      }
    }

  },

  componentDidMount() {
    this.handleChromChange = _throttle(this.handleChromChange, 500);
    this.handleStartPosChange = _throttle(this.handleStartPosChange, 500);
    this.handleEndPosChange = _throttle(this.handleEndPosChange, 500);
  },

  handleChromChange(event) {
    this.setState({
      'chromosome': event.target.value,
      'chromosomeLength': parseInt(this.config.chromosomes[event.target.value].len),
      'startPosition': 0,
      'endPosition': parseInt(this.config.chromosomes[event.target.value].len)
    });
  },

  handleStartPosChange(event) {
    if (event.target) {
      this.setState({'startPosition': event.target.value});
    }
  },

  handleEndPosChange(event) {
    if (event.target) {
      this.setState({'endPosition': event.target.value});
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

    let {chromosome, startPosition, endPosition, chromosomeLength} = this.state;

    let geneList = null;

    if (chromosome === null || startPosition === null || endPosition === null || startPosition === '' || endPosition === '' ) {

      geneList = (
        <p>Select the chromosome and enter the start and end positions.</p>
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
      <div className="stack vertical" style={{padding: '10px'}}>
        <div>
          <span>Chromosome</span>
          <span>: </span>
          <span>
            <select value={chromosome} onChange={this.handleChromChange}>
              {_map(this.config.chromosomes, (length, name) =>
                  <option key={name}
                          value={name}>
                    {name}
                  </option>
              )}
            </select>
          </span>
        </div>
        <div>
          <span>Start</span>
          <span>: </span>
          <span>
            <input value={startPosition}
                   onChange={this.handleStartPosChange}
                   min={0}
                   max={endPosition ? endPosition : chromosomeLength}
                   type="number"
            />
          </span>
          <span> bp</span>
        </div>
        <div>
          <span>End</span>
          <span>: </span>
          <span>
            <input value={endPosition}
                   onChange={this.handleEndPosChange}
                   min={startPosition ? startPosition : 0}
                   max={chromosomeLength}
                   type="number"
            />
          </span>
          <span> bp</span>
        </div>
        <div>
          {geneList}
        </div>
      </div>
    );

  }
});

module.exports = FindGeneByRegion;
