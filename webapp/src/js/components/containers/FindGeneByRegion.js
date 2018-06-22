import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// Lodash
import _map from 'lodash.map';

// Panoptes
import RegionGenesList from 'panoptes/RegionGenesList';

// Panoptes UI
import Icon from 'ui/Icon';

// Material UI
import Button from 'ui/Button';


let FindGeneByRegion = createReactClass({
  displayName: 'FindGeneByRegion',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: PropTypes.func,
    activeTab: PropTypes.string,
    search: PropTypes.string,
    chromosome: PropTypes.string,
    startPosition: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    endPosition: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    chromosomeLength: PropTypes.number,
    onSelect: PropTypes.func
  },

  getDefaultProps() {
    return {
      chromosome: null,
      chromosomeLength: null,
      startPosition: 0,
      endPosition: null,
      findChromosome: null,
      findStartPosition: null,
      findEndPosition: null
    };
  },

  getInitialState() {
    return {
      findChromosome: null,
      findStartPosition: null,
      findEndPosition: null
    };
  },

  componentWillMount() {
    this.props.setProps({'endPosition': parseInt(this.config.chromosomes[this.props.chromosome])});
  },

  handleChromChange(event) {
    this.props.setProps({
      'chromosome': event.target.value,
      'chromosomeLength': parseInt(this.config.chromosomes[event.target.value]),
      'startPosition': 0,
      'endPosition': parseInt(this.config.chromosomes[event.target.value])
    });
  },

  handleStartPosChange(event) {
    if (event.target) {
      this.props.setProps({'startPosition': event.target.value});
    }
  },

  handleEndPosChange(event) {
    if (event.target) {
      this.props.setProps({'endPosition': event.target.value});
    }
  },

  handleFind() {
    this.setState(
      {
        'findChromosome': this.props.chromosome,
        'findStartPosition': this.props.startPosition,
        'findEndPosition': this.props.endPosition
      }
    );
  },

  render() {

    let {chromosome, chromosomeLength, startPosition, endPosition, onSelect} = this.props;
    let {findChromosome, findStartPosition, findEndPosition} = this.state;

    let geneList = null;

    if (findChromosome === null || findStartPosition === null || findEndPosition === null || findStartPosition === '' || findEndPosition === '' ) {

      geneList = (
        <div style={{padding: '10px'}}>
          <p>Select the relevant chromosome and enter the start and end positions.</p>
        </div>
      );

    } else {

      geneList = (
        <RegionGenesList
          chromosome={findChromosome}
          startPosition={parseInt(findStartPosition)}
          endPosition={parseInt(findEndPosition)}
          onSelectGene={onSelect}
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
                <input
                  ref="startPosition"
                  value={startPosition}
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
                <input
                  ref="endPosition"
                  value={endPosition}
                  onChange={this.handleEndPosChange}
                  min={startPosition ? startPosition : 0}
                  max={chromosomeLength}
                  type="number"
                />
              </td>
              <td className="table-col-cell">bp</td>
            </tr>
            <tr>
              <th className="table-col-header"></th>
              <td className="table-col-cell">
                <Button
                  raised="true"
                  label="Find"
                  disabled={startPosition < 0 || endPosition > chromosomeLength}
                  color="primary"
                  iconName="search"
                  iconInverse={true}
                  onClick={this.handleFind}
                />
              </td>
              <td className="table-col-cell"></td>
            </tr>

          </tbody>
        </table>
        {geneList}
      </div>
    );

  },
});

export default FindGeneByRegion;
