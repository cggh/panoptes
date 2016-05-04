import React from 'react';
import HtmlToReact from 'html-to-react';
import ItemMap from 'containers/item_views/ItemMap';
import ItemLink from 'panoptes/ItemLink';
import ComponentWrapper from 'panoptes/ComponentWrapper';
import TreeContainer from 'containers/TreeContainer';
import PlotContainer from 'containers/PlotContainer';
import PopupButton from 'panoptes/PopupButton';

const components = {
  ItemMap: (node, children) =>
    //<ComponentWrapper key={node.attribs.key}><ItemMap {...node.attribs} key={null} /></ComponentWrapper>,
    <ItemMap key={node.attribs.key} {...node.attribs} />,
  ItemLink: (node, children) =>
    <ItemLink key={node.attribs.key} {...node.attribs} />,
  Tree: (node, children) =>
    <TreeContainer key={node.attribs.key} {...node.attribs} />,
  Plot: (node, children) =>
    <PlotContainer key={node.attribs.key} {...node.attribs} />,
  PopupButton: (node, children) =>
    <PopupButton key={node.attribs.key} {...node.attribs} />
};


let HTMLWithComponents = React.createClass({

  propTypes: {
    className: React.PropTypes.string,
    children: React.PropTypes.string
  },

  componentWillMount() {
    let htmlToReactParser = new HtmlToReact.Parser(React, {
      lowerCaseAttributeNames: false,
      lowerCaseTags: false,
      recognizeSelfClosing: true
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
