import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import FluxMixin from 'mixins/FluxMixin';
import {parse, findExportedComponentDefinition} from 'react-docgen'; // react-docgen@next https://github.com/reactjs/react-docgen/issues/47
const rawComponentsLoader = require.context('!raw-loader!.', true, /\.js$/);
const unfriendlyComponentFilePaths = [
  './Map/MapControlComponent.js',
  './Map/TableGeoJSONsLayer.js',
  './custom/analytics/ResistanceTimePlot.js',
  './custom/observatory/ResistanceTimePlot.js',
  './panoptes/ColourPropertyLegend.js',
  './panoptes/DocTemplate.js',
  './panoptes/Feed.js',
  './panoptes/MuiDataTableView.js',
  './panoptes/PercentMatching.js',
  './panoptes/ProportionBarChart.js',
  './panoptes/ProportionBarChartRow.js',
  './panoptes/QueryResult.js',
  './panoptes/SelectRow.js',
  './panoptes/TextRange.js',
];
const parsedComponentFiles = rawComponentsLoader.keys().map((componentFilePath) => { console.log(componentFilePath); return unfriendlyComponentFilePaths.indexOf(componentFilePath) === -1 ? Object.assign({componentFilePath}, parse(rawComponentsLoader(componentFilePath), findExportedComponentDefinition)) : {componentFilePath}; });

/**
 * General component description.
 */
let ComponentDocs = createReactClass({
  displayName: 'ComponentDocs',

  mixins: [
    FluxMixin,
  ],

  propTypes: {
    /**
     * Description of prop "foo".
     */
    foo: PropTypes.number,
    bar: PropTypes.bool.isRequired,
  },

  /**
   * Description of method "icon".
   */
  icon() {
    return 'file-code-o';
  },

  title() {
    return 'Component Docs';
  },

  render() {
//console.log('ComponentDocs parsedComponentFiles: ', parsedComponentFiles);
    const codeTextStyle = {fontFamily: 'monospace'};
    const codeListStyle = {listStyleType: 'square', margin: '10px 0 20px 0'};
    const indentStyle = {marginLeft: '10px', marginTop: '5px'};
    const listItemStyle = {marginTop: '8px'};
    const requiredStyle = {color: 'red'};
    const filePathStyle = {...codeTextStyle, color: 'grey'};

    const menuItems = [];
    const componentDocs = [];
    parsedComponentFiles.forEach((parsedComponentFile) => {
      // FIXME: unfriendlyComponentFilePaths
      if (parsedComponentFile.displayName === undefined) {
        menuItems.push(<li key={'menuItem_' + parsedComponentFile.componentFilePath} style={filePathStyle}>{parsedComponentFile.componentFilePath}</li>);
        return;
      }
      // TODO: Panoptes can't handle <a href={'#' + parsedComponentFile.displayName} style={codeTextStyle}>
      menuItems.push(<li key={'menuItem_' + parsedComponentFile.displayName} style={codeTextStyle}>&lt;{parsedComponentFile.displayName}/&gt;</li>);
      componentDocs.push(
        <div key={parsedComponentFile.displayName} style={{margin: '20px', padding: '20px', border: 'solid 1px lightgrey'}}>
          <div style={{...codeTextStyle, marginBottom: '20px'}}><a name={parsedComponentFile.displayName}>&#8203;</a><strong style={{fontSize: 'larger'}}>&lt;{parsedComponentFile.displayName}/&gt;</strong> <span style={filePathStyle}>{parsedComponentFile.componentFilePath}</span></div>
          <div style={{marginBottom: '20px'}}>{parsedComponentFile.description}</div>
          {parsedComponentFile.props !== undefined ?
            <div>Props:
              <ul style={codeListStyle}>
                {Object.keys(parsedComponentFile.props).map((prop) => {
                  const typeName = parsedComponentFile.props[prop].type !== undefined ? parsedComponentFile.props[prop].type.name : null;
                  const required = parsedComponentFile.props[prop].required;
                  const defaultValue = parsedComponentFile.props[prop].defaultValue !== undefined ? parsedComponentFile.props[prop].defaultValue.value : undefined;
                  const conditionalStyle = required ? requiredStyle : null;
                  return (
                    <li key={parsedComponentFile.displayName + '_' + prop} style={listItemStyle}>
                      <div><strong style={{fontFamily: 'Courier New', ...conditionalStyle}}>{prop}</strong> {typeName} {required ? '(required)' : null} {defaultValue !== undefined ?  ' = ' + defaultValue : null}</div>
                      <div style={indentStyle}>{parsedComponentFile.props[prop].description}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
            : null
          }
          {parsedComponentFile.methods !== undefined && parsedComponentFile.methods.length !== 0 ?
            <div>Methods:
              <ul style={codeListStyle}>
                {parsedComponentFile.methods.map((method) => {
                  // TODO: param.optional
                  const paramList = method.params.map((param) => param.name).join(', ');
                  return (
                    <li key={parsedComponentFile.displayName + '_' + method.name} style={listItemStyle}>
                      <div style={codeTextStyle}><strong>{method.name}(</strong>{paramList}<strong>)</strong></div>
                      <div style={indentStyle}>{method.description}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
            : null
          }
        </div>
      );
    });

    return (
      <div style={{margin: '20px'}}>Components ({parsedComponentFiles.length}):
        <ul style={codeListStyle}>{menuItems}</ul>
        <div>{componentDocs}</div>
      </div>
    );

  }
});

export default ComponentDocs;
