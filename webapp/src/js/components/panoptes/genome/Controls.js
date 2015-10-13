const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');
const ConfigMixin = require('mixins/ConfigMixin');


let Controls = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    chromosome: React.PropTypes.string.isRequired,
    start: React.PropTypes.number.isRequired,
    end: React.PropTypes.number.isRequired,
  },

  handleChange() {
    this.props.componentUpdate({
      chromosome: this.refs.chromosome.value,
      start: parseInt(this.refs.start.value),
      end: parseInt(this.refs.end.value)
    });
  },

  render() {
    let { chromosome, start, end } = this.props;
    return (
      <div className="controls">
        <span> Chromosome: </span>
        <span>
          <select ref="chromosome" value={chromosome} onChange={this.handleChange}>
            {_.map(this.config.chromosomes, (length, name) =>
                <option key={name}
                        value={name}>
                  {name}
                </option>
            )}
          </select>
        </span>
        <span> Start: </span>
        <span>
          <input ref="start" type="number" value={start} onChange={this.handleChange}/>
        </span>
        <span> End: </span>
        <span>
          <input ref="end" type="number" value={end} onChange={this.handleChange}/>
        </span>
      </div>
    );
  }
});

module.exports = Controls;
