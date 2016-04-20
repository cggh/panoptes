import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';

import _map from 'lodash/map';
import _has from 'lodash/has';
import _filter from 'lodash/filter';
import scrollbarSize from 'scrollbar-size';

import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

import Sidebar from 'react-sidebar';
import SidebarHeader from 'ui/SidebarHeader';

import Icon from 'ui/Icon';
import TreeContainer from 'containers/TreeContainer';

import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

import {FlatButton} from 'material-ui';

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
    treeId: React.PropTypes.string
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
    const {table, treeId} = this.props;
    const actions = this.getFlux().actions.panoptes;
    const tree = table && treeId && this.config.tables[table].treesById[treeId];
    if (tree && tree.crossLink && _has(this.config.tables, tree.crossLink.split('::')[0])) {
      const [table, primKey] = tree.crossLink.split('::');
      actions.dataItemPopup({table, primKey});
    }
  },

  render() {
    const {sidebar, table, treeId, componentUpdate} = this.props;

    let tables = _map(_filter(this.config.tables, (table) => table.trees.length > 0),
      (table) => ({
        payload: table.id,
        icon: <Icon fixedWidth={true} name={table.icon}/>,
        text: (<div className="dropdown-option">{table.tableCapNamePlural}</div>)
      }));

    let trees = [];
    if (table) {
       trees = _map(this.config.tables[table].trees,
        (tree) => ({
          payload: tree.id,
          text: (<div className="dropdown-option">{tree.id}</div>)
        }));
    }
    const tree = table && treeId && this.config.tables[table].treesById[treeId];
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
            <SelectField value={treeId}
                         autoWidth={true}
                         floatingLabelText="Tree"
                         onChange={(e, i, v) => componentUpdate({treeId: v})}>
              {trees.map(({payload, text}) =>
                <MenuItem value={payload} key={payload} primaryText={text}/>)}
            </SelectField>
            : null }
          {tree && tree.crossLink && _has(this.config.tables, tree.crossLink.split('::')[0])?
            <FlatButton onClick={this.handleCrossLink}
                        label={`Show ${this.config.tables[tree.crossLink.split('::')[0]].tableCapNameSingle}`}
            />
            : null}
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
                  name={sidebar ? 'arrow-left' : 'bars'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}/>
            <span className="text">Tree</span>
          </div>
          <div>
            <TreeContainer table={table} tree={treeId}/>
          </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = TreeWithActions;
