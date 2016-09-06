import React from 'react';
import HtmlToReact from 'html-to-react';

// Panoptes
import BaseLayerWidget from 'Map/BaseLayer/Widget';
import CircleWidget from 'Map/Circle/Widget';
import FeatureGroupWidget from 'Map/FeatureGroup/Widget';
import ItemLink from 'panoptes/ItemLink';
import LayersControlWidget from 'Map/LayersControl/Widget';
import MapWidget from 'Map/Widget';
import MarkerWidget from 'Map/Marker/Widget';
import OverlayWidget from 'Map/Overlay/Widget';
import PieChartMapWidget from 'Map/Chart/Pie/Widget';
import PlotContainer from 'containers/PlotContainer';
import PopupButton from 'panoptes/PopupButton';
import PopupWidget from 'Map/Popup/Widget';
import RectangleWidget from 'Map/Rectangle/Widget';
import TableMapWidget from 'Map/Table/Widget';
import TableMarkersLayerWidget from 'Map/TableMarkersLayer/Widget';
import TileLayerWidget from 'Map/TileLayer/Widget';
import TreeContainer from 'containers/TreeContainer';



// TODO: Deprecate ItemMap template component in favour of TableMap

/*eslint-disable react/display-name */
const components = {
  BaseLayer: (node, children) =>
    <BaseLayerWidget key={node.attribs.key} {...node.attribs} children={children} />,
  Circle: (node, children) =>
    <CircleWidget key={node.attribs.key} {...node.attribs} />,
  FeatureGroup: (node, children) =>
    <FeatureGroupWidget key={node.attribs.key} {...node.attribs} children={children} />,
  ItemLink: (node, children) =>
    <ItemLink key={node.attribs.key} {...node.attribs} />,
  LayersControl: (node, children) =>
    <LayersControlWidget key={node.attribs.key} {...node.attribs} children={children} />,
  Marker: (node, children) =>
    <MarkerWidget key={node.attribs.key} {...node.attribs} children={children} />,
  Map: (node, children) =>
    <MapWidget key={node.attribs.key} {...node.attribs} children={children} />,
  Overlay: (node, children) =>
    <OverlayWidget key={node.attribs.key} {...node.attribs} children={children} />,
  PieChartMap: (node, children) =>
    <PieChartMapWidget key={node.attribs.key} {...node.attribs} />,
  Plot: (node, children) =>
    <PlotContainer key={node.attribs.key} {...node.attribs} />,
  Popup: (node, children) =>
    <PopupWidget key={node.attribs.key} {...node.attribs} children={children} />,
  PopupButton: (node, children) =>
    <PopupButton key={node.attribs.key} {...node.attribs} />,
  Rectangle: (node, children) =>
    <RectangleWidget key={node.attribs.key} {...node.attribs} />,
  TableMap: (node, children) =>
    <TableMapWidget key={node.attribs.key} {...node.attribs} />,
  TableMarkersLayer: (node, children) =>
    <TableMarkersLayerWidget key={node.attribs.key} {...node.attribs} />,
  TileLayer: (node, children) =>
    <TileLayerWidget key={node.attribs.key} {...node.attribs} />,
  Tree: (node, children) =>
    <TreeContainer key={node.attribs.key} {...node.attribs} />
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
        processNode: (node, children) => (components[node.name] || defaultProcess)(node, children)
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
