import React from 'react';
import HtmlToReact from 'html-to-react';
import PureRenderMixin from 'mixins/PureRenderMixin';

import Formatter from 'panoptes/Formatter';
import Icon from 'ui/Icon';
import FluxMixin from 'mixins/FluxMixin';
import ItemLink from 'panoptes/ItemLink';
import Tooltip from 'rc-tooltip';


const htmlToReactParser = new HtmlToReact.Parser(React, {
  lowerCaseAttributeNames: false,
  lowerCaseTags: false,
  recognizeSelfClosing: true
});


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
    let externalLinkIcon = <i className="fa fa-external-link external-link-icon"></i>;
    let descriptionIcon = prop.valueDescriptions && prop.valueDescriptions[value] ?
      <Tooltip placement="bottom"
                 trigger={['click']}
                 overlay={htmlToReactParser.parse('<span>' + prop.valueDescriptions[value] + '</span>')}>
          <Icon className="info" name="info-circle"/>
        </Tooltip> :
      null;

    if (prop.externalUrl) {
      if (prop.valueDisplays) {
        console.error(`Properties cannot have externalUrl and valueDisplays: ${prop.id}`);
      }
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
    } else if (prop.valueDisplays && prop.valueDisplays[value]) {
      //Wrap as can only have one tag passed to html-to-react
      return <span className="prop">
        {htmlToReactParser.parse('<span>' + prop.valueDisplays[value] + '</span>')}
        {descriptionIcon}
      </span>;
    } else if (prop.dispDataType == 'Boolean' && value !== '') {
      if (value === null) {
        return <span> NULL </span>;
      }
      let val = (value === 1 || value === 'True');
      return <Icon className={(val ? 'prop bool true' : 'prop bool false')}
                   fixedWidth={false}
                   name={val ? 'check' : 'times'} />;
    } else if (prop.relation) {
      return <ItemLink table={prop.relation.tableId} primKey={value} />;
    } else if (prop.isPrimKey) {
      return <ItemLink table={prop.tableId} primKey={value} />;
    }
    return <span className="prop">
      {Formatter(prop, value)}
      {descriptionIcon}
    </span>;
  }

});

export default PropertyCell;
