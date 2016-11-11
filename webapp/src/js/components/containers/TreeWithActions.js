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

// Material UI
import RaisedButton from 'material-ui/RaisedButton';

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
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: React.PropTypes.func,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    table: React.PropTypes.string,
    tree: React.PropTypes.string,
    treeType: React.PropTypes.oneOf(_keys(treeTypes))
  },

  getDefaultProps() {
    return {
      setProps: null,
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
    const treeInfo = table && tree && this.config.tablesById[table].trees[tree];
    if (treeInfo && treeInfo.crossLink && _has(this.config.tablesById, treeInfo.crossLink.split('::')[0])) {
      const [table, primKey] = treeInfo.crossLink.split('::');
      actions.dataItemPopup({table, primKey});
    }
  },

  handleChangeTable(table) {
    this.props.setProps({table});
  },

  handleChangeTree(tree) {
    this.props.setProps({tree});
  },

  handleChangeTreeType(treeType) {
    this.props.setProps({treeType});
  },

  render() {
    const {sidebar, table, tree, treeType, setProps} = this.props;

    let tableOptions = _map(_filter(this.config.visibleTables, (table) => table.trees),
      (table) => ({
        value: table.id,
        leftIcon: <Icon fixedWidth={true} name={table.icon}/>,
        label: table.capNamePlural
      })
    );

    let treeOptions = [];
    if (table) {
      treeOptions = _map(this.config.tablesById[table].trees,
        (tree, id) => ({
          value: id,
          label: tree.name
        })
      );
    }

    let treeTypeOptions = _map(_keys(treeTypes),
      (treeType) => ({
        value: treeType,
        label: titleCase(treeType)
      })
    );

    const treeInfo = table && tree && this.config.tablesById[table].trees[tree];

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
          {treeInfo && treeInfo.crossLink && _has(this.config.tablesById, treeInfo.crossLink.split('::')[0]) ?
            <RaisedButton onClick={this.handleCrossLink}
                        label={`Show ${this.config.tablesById[treeInfo.crossLink.split('::')[0]].capNameSingle}`}
                        icon={<Icon fixedWidth={true} name={this.config.tablesById[treeInfo.crossLink.split('::')[0]].icon} />}
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
                  name={sidebar ? 'arrow-left' : 'bars'}
                  title={sidebar ? 'Expand' : 'Sidebar'}
                  onClick={() => setProps({sidebar: !sidebar})}/>
            <span className="text">Tree {table ? `of ${this.config.tablesById[table].capNamePlural}` : ''} </span>
          </div>
          <div className="grow">
            <TreeContainer {...this.props}/>
          </div>
        </div>
      </Sidebar>
    );
  }
});

export default TreeWithActions;
