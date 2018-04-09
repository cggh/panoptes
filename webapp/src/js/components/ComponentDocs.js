import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import FluxMixin from 'mixins/FluxMixin';
import {parse, findAllExportedComponentDefinitions} from 'react-docgen'; // react-docgen@next https://github.com/reactjs/react-docgen/issues/47
const rawComponentsLoader = require.context('!raw-loader!.', true, /\.js$/);
import Table, {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
} from 'material-ui/Table';
import Tooltip from 'material-ui/Tooltip';

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

    const codeTextStyle = {fontFamily: 'monospace'};
    const codeListStyle = {listStyleType: 'square', margin: '10px 0 20px 0'};
    const indentStyle = {marginLeft: '10px', marginTop: '5px'};
    const listItemStyle = {marginTop: '8px'};
    const requiredStyle = {color: 'red'};
    const filePathStyle = {...codeTextStyle, color: 'grey'};
    const warningStyle = {color: 'red'};

    let unfriendlyComponentFilePaths = [];
    const parsedComponentFiles = rawComponentsLoader.keys().map((componentFilePath) => {
      let parsedComponentFile = undefined;
      try {
        parsedComponentFile = parse(rawComponentsLoader(componentFilePath), findAllExportedComponentDefinitions);
        return Object.assign({componentFilePath}, parsedComponentFile);
      } catch (e) {
        console.warn('Error parsing doc for component file: ', componentFilePath, e);
        unfriendlyComponentFilePaths.push(componentFilePath);
        return {componentFilePath};
      }
    });

    if (unfriendlyComponentFilePaths.length !== 0) {
      console.info('Unfriendly component files:', unfriendlyComponentFilePaths);
    }

    let menuItemsAsRows = [];
    let componentDocs = [];
    let componentDisplayNamePaths = {};
    parsedComponentFiles.forEach((parsedComponentFile) => {
      // Show components without displayName (e.g. parse errors) as file paths.
      if (parsedComponentFile.displayName === undefined) {
        menuItemsAsRows.push(
          <TableRow key={'menuItem_' + parsedComponentFile.componentFilePath}>
            <TableCell padding="none" style={warningStyle}>Could not parse file.</TableCell>
            <TableCell numeric>?</TableCell>
            <TableCell style={filePathStyle} padding="none">{parsedComponentFile.componentFilePath}</TableCell>
          </TableRow>
        );
        return;
      }
      // Keep track of component displayName duplicates.
      if (componentDisplayNamePaths[parsedComponentFile.displayName] === undefined) {
        componentDisplayNamePaths[parsedComponentFile.displayName] = [parsedComponentFile.componentFilePath];
      } else {
        componentDisplayNamePaths[parsedComponentFile.displayName].push(parsedComponentFile.componentFilePath);
      }
      // TODO: Panoptes can't handle <a href={'#' + parsedComponentFile.displayName} style={codeTextStyle}>
      menuItemsAsRows.push(
        <TableRow key={'menuItem_' + parsedComponentFile.displayName + '_' + componentDisplayNamePaths[parsedComponentFile.displayName].length}>
          <TableCell style={codeTextStyle} padding="none"><strong>&lt;{parsedComponentFile.displayName}/&gt;</strong></TableCell>
          <TableCell style={codeTextStyle} numeric>{componentDisplayNamePaths[parsedComponentFile.displayName].length > 1 ? <span style={warningStyle}>{(componentDisplayNamePaths[parsedComponentFile.displayName].length - 1)}</span> : 0}</TableCell>
          <TableCell style={filePathStyle} padding="none">{parsedComponentFile.componentFilePath}</TableCell>
        </TableRow>
      );
      componentDocs.push(
        <div key={parsedComponentFile.displayName + '_' + componentDisplayNamePaths[parsedComponentFile.displayName].length} style={{margin: '20px', padding: '20px', border: 'solid 1px lightgrey'}}>
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
    console.info('componentDisplayNamePaths: ', componentDisplayNamePaths);

    return (
      <div style={{margin: '20px'}}>Below is a list of all {parsedComponentFiles.length} local components, followed by the extracted documentation for each component:
        <Table>
          <TableHead>
            <TableRow>
              <TableCell
                key="componentName"
                padding="none"
              >
                <Tooltip
                  title="TODO: sort"
                >
                  <TableSortLabel>
                    Component Name
                  </TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell
                key="componentDuplicates"
                numeric
              >
                <Tooltip
                  title="TODO: sort"
                >
                  <TableSortLabel>
                    Duplicates
                  </TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell
                key="componentPath"
                padding="none"
              >
                <Tooltip
                  title="TODO: sort"
                >
                  <TableSortLabel>
                    Component Path
                  </TableSortLabel>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {menuItemsAsRows}
          </TableBody>
        </Table>
        <div>{componentDocs}</div>
      </div>
    );

  }
});

export default ComponentDocs;
