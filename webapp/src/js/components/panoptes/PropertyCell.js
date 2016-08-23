import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';

import Formatter from 'panoptes/Formatter';
import Icon from 'ui/Icon';
import FluxMixin from 'mixins/FluxMixin';
import ItemLink from 'panoptes/ItemLink';

let PropertyCell = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    prop: React.PropTypes.object,
    value: React.PropTypes.any
  },

  render() {
    let {prop, value} = this.props;
    let text = Formatter(prop, value);
    let externalLinkIcon = <i className="fa fa-external-link external-link-icon"></i>;
    if (prop.externalUrl) {
      let refs = value.split(';');
      return (<span className="prop">
        {refs.map((ref, index) => (
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
      let val = (value == 'True');
      return <Icon className={(val ? 'prop bool true' : 'prop bool false')}
                   fixedWidth={false}
                   name={val ? 'check' : 'times'} />;
    } else if (prop.isPrimKey) {
      return <ItemLink table={prop.tableId} primKey={value} />;
    }
    return <span className="prop">
      {text}
    </span>;
  }

});

module.exports = PropertyCell;
