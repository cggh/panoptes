import React from 'react';
import HtmlToReact from 'html-to-react';

import ItemLink from 'panoptes/ItemLink';
import TreeContainer from 'containers/TreeContainer';
import PlotContainer from 'containers/PlotContainer';
import PopupButton from 'panoptes/PopupButton';
import MapWidget from 'Map/Widget';
import MapMarkerWidget from 'Map/Marker/Widget';
import TableMapWidget from 'Map/Table/Widget';




// TODO: Deprecate ItemMap template component in favour of TableMap

/*eslint-disable react/display-name */
const components = {
  ItemLink: (node, children) =>
    <ItemLink key={node.attribs.key} {...node.attribs} />,
  Tree: (node, children) =>
    <TreeContainer key={node.attribs.key} {...node.attribs} />,
  Plot: (node, children) =>
    <PlotContainer key={node.attribs.key} {...node.attribs} />,
  PopupButton: (node, children) =>
    <PopupButton key={node.attribs.key} {...node.attribs} />,
  ItemMap: (node, children) =>
    <TableMapWidget key={node.attribs.key} {...node.attribs} />,
  Map: (node, children) => {
    console.log('Map node: %o', node);
    console.log('Map children: %o', children);
    return <MapWidget key={node.attribs.key} {...node.attribs}>{node.children}</MapWidget>;
  },
  MapMarker: (node, children) =>
    <MapMarkerWidget key={node.attribs.key} {...node.attribs} />,
  TableMap: (node, children) =>
    <TableMapWidget key={node.attribs.key} {...node.attribs} />,
  PieChartMap: (node, children) =>
    <TableMapWidget key={node.attribs.key} {...node.attribs} />,
  BarChartMap: (node, children) =>
    <TableMapWidget key={node.attribs.key} {...node.attribs} />,
  LayerMap: (node, children) =>
    <MapWidget key={node.attribs.key} {...node.attribs} />,
  LayerGroup: (node, children) =>
    <MapWidget key={node.attribs.key} {...node.attribs} />,
};
/*eslint-enable react/display-name */

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
