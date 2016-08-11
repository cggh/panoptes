import React from 'react';
import HtmlToReact from 'html-to-react';

import ItemLink from 'panoptes/ItemLink';
import TreeContainer from 'containers/TreeContainer';
import PlotContainer from 'containers/PlotContainer';
import PopupButton from 'panoptes/PopupButton';
import MapWidget from 'Map/Widget';
import TileLayerWidget from 'Map/TileLayer/Widget';
import BaseLayerWidget from 'Map/BaseLayer/Widget';
import MarkerWidget from 'Map/Marker/Widget';
import CircleWidget from 'Map/Circle/Widget';
import RectangleWidget from 'Map/Rectangle/Widget';
import OverlayWidget from 'Map/Overlay/Widget';
import FeatureGroupWidget from 'Map/FeatureGroup/Widget';
import PopupWidget from 'Map/Popup/Widget';
import LayersControlWidget from 'Map/LayersControl/Widget';
import TableMarkersLayerWidget from 'Map/TableMarkersLayer/Widget';


// import MapBaseLayerWidget from 'Map/BaseLayer/Widget';
// import MapOverLayerWidget from 'Map/OverLayer/Widget';


// TODO: Deprecate ItemMap template component in favour of TableMap

/*
Marker: (node, children) =>
  <MapMarkerWidget key={node.attribs.key} {...node.attribs} />,
BaseLayer: (node, children) =>
  <MapBaseLayerWidget key={node.attribs.key} {...node.attribs}>{node.children}</MapBaseLayerWidget>,
OverLayer: (node, children) =>
  <MapOverLayerWidget key={node.attribs.key} {...node.attribs}>{node.children}</MapOverLayerWidget>,
TableMap: (node, children) =>
  <TableMapWidget key={node.attribs.key} {...node.attribs} />,
PieChartMap: (node, children) =>
  <TableMapWidget key={node.attribs.key} {...node.attribs} />,
BarChartMap: (node, children) =>
  <TableMapWidget key={node.attribs.key} {...node.attribs} />,
  ItemMap: (node, children) =>
    <TableMapWidget key={node.attribs.key} {...node.attribs} />,
*/

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
  Map: (node, children) =>
    <MapWidget key={node.attribs.key} {...node.attribs} children={children} />,
  LayersControl: (node, children) =>
    <LayersControlWidget key={node.attribs.key} {...node.attribs} children={children} />,
  BaseLayer: (node, children) =>
    <BaseLayerWidget key={node.attribs.key} {...node.attribs} children={children} />,
  TileLayer: (node, children) =>
    <TileLayerWidget key={node.attribs.key} {...node.attribs} />,
  FeatureGroup: (node, children) =>
    <FeatureGroupWidget key={node.attribs.key} {...node.attribs} children={children} />,
  Marker: (node, children) =>
    <MarkerWidget key={node.attribs.key} {...node.attribs} children={children} />,
  Popup: (node, children) =>
    <PopupWidget key={node.attribs.key} {...node.attribs} children={children} />,
  Overlay: (node, children) =>
    <OverlayWidget key={node.attribs.key} {...node.attribs} children={children} />,
  Circle: (node, children) =>
    <CircleWidget key={node.attribs.key} {...node.attribs} />,
  Rectangle: (node, children) =>
    <RectangleWidget key={node.attribs.key} {...node.attribs} />,
  TableMap: (node, children) =>
    <MapWidget key={node.attribs.key} {...node.attribs}><LayersControlWidget hideLayersControl="true"><BaseLayerWidget><TileLayerWidget /></BaseLayerWidget><OverlayWidget><TableMarkersLayerWidget table={node.attribs.table} primKey={node.attribs.primKey} /></OverlayWidget></LayersControlWidget></MapWidget>,
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
