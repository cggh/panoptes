import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';

import _map from 'lodash/map';
import _has from 'lodash/has';
import _filter from 'lodash/filter';
import scrollbarSize from 'scrollbar-size';
import {treeTypes} from 'phylocanvas';
import _keys from 'lodash/keys';
import titleCase from 'title-case';

import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

import Sidebar from 'react-sidebar';
import SidebarHeader from 'ui/SidebarHeader';

import Icon from 'ui/Icon';
import TreeContainer from 'containers/TreeContainer';

import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

import {FlatButton} from 'material-ui';


import SelectFieldWithNativeFallback from 'panoptes/SelectFieldWithNativeFallback';

import 'tree.scss';

let TreeWithActions = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    table: React.PropTypes.string,
    tree: React.PropTypes.string,
    treeType: React.PropTypes.oneOf(_keys(treeTypes))
  },

  getDefaultProps() {
    return {
      componentUpdate: null,
      sidebar: true
    };
  },

  icon() {
    return 'tree';
  },

  title() {
    return this.props.title || 'Tree';
  },

  handleCrossLink() {
    const {table, tree} = this.props;
    const actions = this.getFlux().actions.panoptes;
    const treeInfo = table && tree && this.config.tables[table].treesById[tree];
    if (treeInfo && treeInfo.crossLink && _has(this.config.tables, treeInfo.crossLink.split('::')[0])) {
      const [table, primKey] = treeInfo.crossLink.split('::');
      actions.dataItemPopup({table, primKey});
    }
  },

  render() {
    const {sidebar, table, tree, treeType, componentUpdate} = this.props;

    let tables = _map(_filter(this.config.tables, (table) => table.trees.length > 0 && !table.settings.isHidden),
      (table) => ({
        payload: table.id,
        icon: <Icon fixedWidth={true} name={table.icon}/>,
        text: (<div className="dropdown-option">{table.tableCapNamePlural}</div>)
      }));

    let trees = [];
    if (table) {
      trees = _map(this.config.tables[table].trees,
        (tree) => ({
          value: tree.id,
          label: tree.id
        })
      );
    }
    const treeInfo = table && tree && this.config.tables[table].treesById[tree];
    let sidebarContent = (
      <div className="sidebar tree-sidebar">
        <SidebarHeader icon={this.icon()} description="Something here"/>
        <div className="tree-controls vertical stack">
          <SelectField value={table}
                       autoWidth={true}
                       floatingLabelText="Table:"
                       onChange={(e, i, v) => componentUpdate({table: v})}>
            {tables.map(({payload, text, icon}) =>
              <MenuItem value={payload} key={payload} leftIcon={icon} primaryText={text}/>)}
          </SelectField>
          {table ?
            <SelectFieldWithNativeFallback
              value={tree}
              autoWidth={true}
              floatingLabelText="Tree"
              onChange={(e, i, v) => componentUpdate({tree: v})}
              options={trees}
            />
            : null }
          {treeInfo && treeInfo.crossLink && _has(this.config.tables, treeInfo.crossLink.split('::')[0]) ?
            <FlatButton onClick={this.handleCrossLink}
                        label={`Show ${this.config.tables[treeInfo.crossLink.split('::')[0]].tableCapNameSingle}`}
            />
            : null}
          {treeInfo ?
            <SelectField value={treeType}
                         autoWidth={true}
                         floatingLabelText="Tree Layout"
                         onChange={(e, i, v) => componentUpdate({treeType: v})}>
              {_keys(treeTypes).map((treeType) =>
                <MenuItem value={treeType} key={treeType} primaryText={titleCase(treeType)}/>)}
            </SelectField>
            : null }
        </div>
      </div>
    );
    return (
      <Sidebar
        docked={sidebar}
        styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'arrows-h' : 'bars'}
                  title={sidebar ? 'Expand' : 'Sidebar'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}/>
            <span className="text">Tree {table ? `of ${this.config.tables[table].tableCapNamePlural}` : ''} </span>
          </div>
          <div className="grow">
            <TreeContainer {...this.props}/>
          </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = TreeWithActions;
