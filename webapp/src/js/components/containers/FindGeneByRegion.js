import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// Lodash
import _map from 'lodash/map';

// Panoptes
import RegionGenesList from 'panoptes/RegionGenesList';

// Panoptes UI
import Icon from 'ui/Icon';

// Material UI
import RaisedButton from 'material-ui/RaisedButton';


let FindGeneByRegion = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    activeTab: React.PropTypes.string,
    search: React.PropTypes.string,
    chromosome: React.PropTypes.string,
    startPosition: React.PropTypes.number,
    endPosition: React.PropTypes.number,
    chromosomeLength: React.PropTypes.number,
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
    this.props.componentUpdate({'endPosition': parseInt(this.config.chromosomes[this.props.chromosome].len)});
  },

  handleChromChange(event) {
    this.props.componentUpdate({
      'chromosome': event.target.value,
      'chromosomeLength': parseInt(this.config.chromosomes[event.target.value].len),
      'startPosition': 0,
      'endPosition': parseInt(this.config.chromosomes[event.target.value].len)
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

  handleFind() {
    this.setState(
      {
        'findChromosome': this.props.chromosome,
        'findStartPosition': this.props.startPosition,
        'findEndPosition': this.props.endPosition
      }
    );
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

    let {chromosome, chromosomeLength, startPosition, endPosition} = this.props;
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
              <RaisedButton
                label="Find"
                disabled={startPosition < 0 || endPosition > chromosomeLength}
                primary={true}
                icon={<Icon fixedWidth={true} name="search" inverse={true} />}
                onClick={this.handleFind}
              />
            </td>
            <td className="table-col-cell"></td>
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
