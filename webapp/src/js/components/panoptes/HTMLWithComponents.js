import React from 'react';
import HtmlToReact from 'html-to-react';
import ItemMap from 'containers/item_views/ItemMap';
import ItemLink from 'panoptes/ItemLink';
import ComponentWrapper from 'panoptes/ComponentWrapper';


const components = {
  ItemMap: (node, children) =>
    //<ComponentWrapper key={node.attribs.key}><ItemMap {...node.attribs} key={null} /></ComponentWrapper>,
    <ItemMap {...node.attribs} />,
  ItemLink: (node, children) =>
    <ItemLink {...node.attribs} />
};


let HTMLWithComponents = React.createClass({

  propTypes: {
    className: React.PropTypes.string,
    children: React.PropTypes.string
  },

  componentWillMount() {
    let htmlToReactParser = new HtmlToReact.Parser(React, {
      lowerCaseAttributeNames: false,
      lowerCaseTags: false
    });
    let defaultProcess = new HtmlToReact.ProcessNodeDefinitions(React).processDefaultNode;
    let processingInstructions = [
      {
        shouldProcessNode: (node) => true,
        processNode: (node, children) =>
          (components[node.name] || defaultProcess)(node, children)
      }
    ];
    let isValidNode = () => true;

    this.htmlToReact = (markupString) =>
      htmlToReactParser.parseWithInstructions(
        markupString,
        isValidNode,
        processingInstructions);
  },

  render() {
    return this.htmlToReact(`<div class="${this.props.className}">${this.props.children}</div>`);
  }
});

module.exports = HTMLWithComponents;
