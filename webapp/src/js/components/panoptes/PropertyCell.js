const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');
const _ = require('lodash');

const Formatter = require('panoptes/Formatter');
const Icon = require('ui/Icon');
const FluxMixin = require('mixins/FluxMixin');


let PropertyCell = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    prop: React.PropTypes.object,
    value: React.PropTypes.any
  },

  handleClick() {
    let actions = this.getFlux().actions.panoptes;
    let {prop, value} = this.props;
    actions.dataItemPopup({table: prop.tableid, primKey: value.toString()});
  },

  render() {
    let {prop, value} = this.props;
    let text = Formatter(prop, value);
    let externalLinkIcon = <i className="fa fa-external-link external-link-icon"></i>;
    if (prop.externalUrl) {
      let refs = value.split(';');
      return (<span className="prop">
        {_.map(refs, (ref, index) => (
          <span key={index}>
          {index === 0 ? externalLinkIcon : null}
          <a target="_blank" href={prop.externalUrl.replace('{value}', ref)}>
            {ref}
          </a>
            {index < refs.length - 1 ? ', ' : null}
        </span>
        ))}
      </span>);
    } else if (prop.dispDataType == 'Boolean' && value !== '') {
      let val = (value == '1');
      return <Icon className={(val ? 'prop bool true' : 'prop bool false')}
                   fixedWidth={false}
                   name={val ? 'check' : 'times'}/>;
    } else if (prop.isPrimKey) {
      return <span className="prop internal-link"
            onClick={this.handleClick}>
      {text}
    </span>;
    }
    return <span className="prop">
      {text}
    </span>;
  }

});

module.exports = PropertyCell;
