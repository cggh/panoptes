import React from 'react';
import scrollbarSize from 'scrollbar-size';
import {treeTypes} from 'phylocanvas';
import titleCase from 'title-case';
import Sidebar from 'react-sidebar';

// Lodash
import _map from 'lodash/map';
import _has from 'lodash/has';
import _filter from 'lodash/filter';
import _keys from 'lodash/keys';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import FluxMixin from 'mixins/FluxMixin';

// Material U(I
import {RaisedButton} from 'material-ui';

// Panoptes UI
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';

// Panoptes
import TreeContainer from 'containers/TreeContainer';
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

  handleChangeTable(table) {
    this.props.componentUpdate({table});
  },

  handleChangeTree(tree) {
    this.props.componentUpdate({tree});
  },

  handleChangeTreeType(treeType) {
    this.props.componentUpdate({treeType});
  },

  render() {
    const {sidebar, table, tree, treeType, componentUpdate} = this.props;

    let tableOptions = _map(_filter(this.config.tables, (table) => table.trees.length > 0 && !table.settings.isHidden),
      (table) => ({
        value: table.id,
        leftIcon: <Icon fixedWidth={true} name={table.icon}/>,
        label: table.tableCapNamePlural
      })
    );

    let treeOptions = [];
    if (table) {
      treeOptions = _map(this.config.tables[table].trees,
        (tree) => ({
          value: tree.id,
          label: tree.id
        })
      );
    }

    let treeTypeOptions = _map(_keys(treeTypes),
      (treeType) => ({
        value: treeType,
        label: titleCase(treeType)
      })
    );

    const treeInfo = table && tree && this.config.tables[table].treesById[tree];

    let sidebarContent = (
      <div className="sidebar tree-sidebar">
        <SidebarHeader icon={this.icon()} description="Something here"/>
        <div className="tree-controls vertical stack">
          <SelectFieldWithNativeFallback
            value={table}
            autoWidth={true}
            floatingLabelText="Table"
            onChange={this.handleChangeTable}
            options={tableOptions}
          />
          {table ?
            <SelectFieldWithNativeFallback
              value={tree}
              autoWidth={true}
              floatingLabelText="Tree"
              onChange={this.handleChangeTree}
              options={treeOptions}
            />
            : null }
          {treeInfo && treeInfo.crossLink && _has(this.config.tables, treeInfo.crossLink.split('::')[0]) ?
            <RaisedButton onClick={this.handleCrossLink}
                        label={`Show ${this.config.tables[treeInfo.crossLink.split('::')[0]].tableCapNameSingle}`}
                        icon={<Icon fixedWidth={true} name={this.config.tables[treeInfo.crossLink.split('::')[0]].icon} />}
            />
            : null}
          {treeInfo ?
            <SelectFieldWithNativeFallback
              value={treeType}
              autoWidth={true}
              floatingLabelText="Tree Layout"
              onChange={this.handleChangeTreeType}
              options={treeTypeOptions}
            />
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
