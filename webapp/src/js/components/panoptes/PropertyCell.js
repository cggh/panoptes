import React from 'react';
import createReactClass from 'create-react-class';
import HtmlToReact from 'html-to-react';
import PureRenderMixin from 'mixins/PureRenderMixin';

import Formatter from 'panoptes/Formatter';
import Icon from 'ui/Icon';
import FluxMixin from 'mixins/FluxMixin';
import ItemLink from 'panoptes/ItemLink';
import PropTypes from 'prop-types';
import Tooltip from 'rc-tooltip';
import TooltipEllipsis from 'ui/TooltipEllipsis';


const htmlToReactParser = new HtmlToReact.Parser(React, {
  lowerCaseAttributeNames: false,
  lowerCaseTags: false,
  recognizeSelfClosing: true
});


let PropertyCell = createReactClass({
  displayName: 'PropertyCell',

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    prop: PropTypes.object,
    value: PropTypes.any,
    noLinks: PropTypes.bool,
    prefix: PropTypes.node,
    onClick: PropTypes.func,
    className: PropTypes.string,
    nullReplacement: PropTypes.string,
    nanReplacement: PropTypes.string,
  },

  render() {
    let {prop, value, noLinks, prefix, onClick, className, nullReplacement, nanReplacement, ...other} = this.props;
    let externalLinkIcon = <i className="fa fa-external-link external-link-icon"></i>;
    let descriptionIcon = !noLinks && prop.valueDescriptions && prop.valueDescriptions[value] ?
      <Tooltip placement="bottom"
        trigger={['click']}
        overlay={htmlToReactParser.parse(`<span>${prop.valueDescriptions[value]}</span>`)}>
        <Icon className="info" name="info-circle"/>
      </Tooltip> :
      null;
    let content = Formatter(prop, value, nullReplacement, nanReplacement);
    if (prop.externalUrl && !noLinks) {
      if (prop.valueDisplays) {
        console.error(`Properties cannot have externalUrl and valueDisplays: ${prop.id}`);
      }
      let refs = value.split(';');
      content = refs.map((ref, index) => (
        <span key={index}>
          {index === 0 ? externalLinkIcon : null}
          <a target="_blank" rel="noopener noreferrer" href={prop.externalUrl.replace('{value}', ref)}>
            {ref}
          </a>
          {index < refs.length - 1 ? ', ' : null}
        </span>
      ));
    } else if (prop.valueDisplays && prop.valueDisplays[value]) {
      //Wrap as can only have one tag passed to html-to-react
      content = htmlToReactParser.parse(`<span>${prop.valueDisplays[value]}</span>`);
    } else if (prop.dispDataType == 'Boolean' && value !== '') {
      if (value === null) {
        content = 'NULL';
      } else {
        let val = (value === 1 || value === 'True');
        content = <Icon className={(val ? 'prop bool true' : 'prop bool false')}
          fixedWidth={false}
          name={val ? 'check' : 'times'}/>;
      }
    } else if (!noLinks && prop.relation && !prop.hideLink) {
      content = <ItemLink table={prop.relation.tableId} primKey={value} />;
    } else if (!noLinks && prop.isPrimKey && !prop.hideLink) {
      content = <ItemLink table={prop.tableId} primKey={value} />;
    }
    return (
      <span
        className={`prop ${className}` || ''}
        onClick={(event) => {
          if (onClick && event.target.className.indexOf('info') == -1)
            onClick(event);
        }}
        {...other}
      >
        {prefix}
        <TooltipEllipsis className="label">{content}</TooltipEllipsis>
        {descriptionIcon}
      </span>
    );
  },
});

export default PropertyCell;
