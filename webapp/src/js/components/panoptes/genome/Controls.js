const _ = require('lodash');
const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');
const ConfigMixin = require('mixins/ConfigMixin');

const FALLBACK_MAXIMUM = 1000000000;

let Controls = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    chromosome: React.PropTypes.string.isRequired,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired
  },

  componentWillMount() {
    this.setFromProps(this.props);
  },

  componentWillReceiveProps(nextProps) {
    this.setFromProps(nextProps);
  },

  setFromProps(props) {
    let {start, end} = props;
    this.setState({
      midpoint: (end + start) / 2,
      width: end - start
    });
  },

  handleChromChange() {
    this.props.componentUpdate({
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
      _.isFinite(mid) &&
      _.isFinite(width) &&
      mid >= 0 &&
      mid <= (this.config.chromosomes[this.props.chromosome].len || FALLBACK_MAXIMUM) &&
      width > this.props.minWidth
    ) {
      this.props.componentUpdate({
        start: mid - (width / 2),
        end: mid + (width / 2)
      });
    }
  },

  render() {
    let {chromosome, minWidth} = this.props;
    let {midpoint, width} = this.state;
    let max = this.config.chromosomes[chromosome].len || FALLBACK_MAXIMUM;
    return (
      <span className="controls">
        <span> Chromosome: </span>
        <span>
          <select ref="chromosome" value={chromosome} onChange={this.handleChromChange}>
            {_.map(this.config.chromosomes, (length, name) =>
                <option key={name}
                        value={name}>
                  {name}
                </option>
            )}
          </select>
        </span>
        <span> Midpoint: </span>
        <span>
          <input ref="midpoint"
                 type="number"
                 min={0}
                 max={max}
                 value={parseInt(midpoint)}
                 onChange={this.handleRangeChange}/>
        </span>
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
    );
  }
});

module.exports = Controls;
