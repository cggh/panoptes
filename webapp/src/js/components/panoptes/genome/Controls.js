import _isFinite from 'lodash/isFinite';
import _map from 'lodash/map';
import _has from 'lodash/has';
import classnames from 'classnames';
import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

const FALLBACK_MAXIMUM = 214700000;

let Controls = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: React.PropTypes.func.isRequired,
    chromosome: React.PropTypes.string.isRequired,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
    minWidth: React.PropTypes.number.isRequired,
  },

  componentWillMount() {
    this.setFromProps(this.props);
  },

  componentWillReceiveProps(nextProps) {
    this.setFromProps(nextProps);
  },

  setFromProps(props) {
    let {start, end, chromosome} = props;
    this.setState({
      midpoint: (end + start) / 2,
      width: end - start,
      regionText: `${chromosome}:${Math.round(start)}-${Math.round(end)}`,
      regionValid: true
    });
  },

  handleChromChange() {
    this.props.setProps({
      chromosome: this.refs.chromosome.value
    });
  },

  handleRangeChange() {
    this.setState({
      midpoint: this.refs.midpoint.value,
      width: this.refs.width.value
    });
    let mid = parseInt(this.refs.midpoint.value);
    let width = parseInt(this.refs.width.value);
    if (
      _isFinite(mid) &&
      _isFinite(width) &&
      mid >= 0 &&
      mid <= (this.config.chromosomes[this.props.chromosome] || FALLBACK_MAXIMUM) &&
      width > this.props.minWidth
    ) {
      this.props.setProps({
        start: mid - (width / 2),
        end: mid + (width / 2)
      });
    }
  },

  handleRegionChange() {
    let regionText = this.refs.region.value;
    this.setState({regionText});
    let match = regionText.trim().match(/^(?:(.+):)?([0-9]+)-([0-9]+)$/);
    if (match) {
      let [chromosome, start, end] = match.slice(1);
      start = parseInt(start);
      end = parseInt(end);
      chromosome = chromosome || this.props.chromosome;
      if (_has(this.config.chromosomes, chromosome)  && start < end) {
        this.setState({regionValid: true});
        this.props.setProps({chromosome, start, end});
        return;
      }
    }
    this.setState({regionValid: false});
  },

  render() {
    let {chromosome, minWidth} = this.props;
    let {midpoint, width, regionText, regionValid} = this.state;
    let max = this.config.chromosomes[chromosome] || FALLBACK_MAXIMUM;
    return (
      <span className="controls">
        <span className="block">
          <span> Chromosome: </span>
          <span>
            <select ref="chromosome" value={chromosome} onChange={this.handleChromChange}>
              {_map(this.config.chromosomes, (length, name) =>
                  <option key={name}
                          value={name}>
                    {name}
                  </option>
              )}
            </select>
          </span>
        </span>
        <span className="block">
          <span> Region: </span>
          <span>
            <input className={classnames({wide: true, invalid: !regionValid})}
                   ref="region"
                   type="text"
                   spellCheck="false"
                   value={regionText}
                   min={minWidth}
                   max={max}
                   onChange={this.handleRegionChange}/>
          </span>
        </span>
        <span className="block">
          <span> Midpoint: </span>
          <span>
            <input ref="midpoint"
                    type="number"
                    min={0}
                    max={max}
                    value={parseInt(midpoint)}
                    onChange={this.handleRangeChange}/>
          </span>
        </span>
        <span className="block">
          <span> Width: </span>
          <span>
             <input ref="width"
                    type="number"
                    value={parseInt(width)}
                    min={minWidth}
                    max={max}
                    onChange={this.handleRangeChange}/>
           </span>
        </span>

      </span>
    );
  }
});

export default Controls;
