import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import scrollbarSize from 'scrollbar-size';
import EditYAMLConfig from 'panoptes/EditYAMLConfig';
import _map from 'lodash.map';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import Sidebar from 'ui/Sidebar';
import Divider from 'material-ui/Divider';
import Button from 'ui/Button';
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import ConfirmButton from 'ui/ConfirmButton';
import Loading from 'ui/Loading';

import DatasetImportStatusListView from 'DatasetImportStatus/ListView';
import API from 'panoptes/API';
import ComponentDocs from 'ComponentDocs';

let DatasetManagerActions = createReactClass({
  displayName: 'DatasetManagerActions',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: PropTypes.func,
    title: PropTypes.string,
    sidebar: PropTypes.bool
  },

  getDefaultProps() {
    return {sidebar: true};
  },

  icon() {
    return 'database';
  },

  title() {
    return this.props.title || 'Dataset Manager';
  },

  handleReimport() {
    API.importDataset(this.config.dataset);
    // The import status logs should refresh every refreshMilliseconds.
  },

  render() {
    let {sidebar, setProps} = this.props;

    if (!this.config.user.isManager) {
      return <Loading status="custom">Sorry you do not have management permissions for this dataset</Loading>;
    }

    const name = this.config.settings.name;
    const dataset = this.config.dataset;
    const buttonStyle = {width: '100%', justifyContent: 'left'};

    let sidebarContent = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()} description={`Import and configure the ${name} (${dataset}) dataset`} />
        <ConfirmButton
          label="Reimport everything"
          color="primary"
          iconName="refresh"
          message={`Are you sure you want to reimport everything for the ${name} (${dataset}) dataset?`}
          onConfirm={() => this.handleReimport()}
          style={buttonStyle}
        />
        <Button
          color="primary"
          onClick={() => this.getFlux().actions.session.tabOpen(<ComponentDocs/>, true)}
          iconName="file-code-o"
          label="Component Docs"
          style={buttonStyle}
        />
        <Button
          color="primary"
          onClick={() => this.getFlux().actions.session.modalOpen(<EditYAMLConfig path="settings"/>)}
          iconName="edit"
          label="Edit dataset config"
          style={buttonStyle}
        />
        {this.config.genome !== null ?
          <div>
            <Divider />
            <Button
              color="primary"
              onClick={() => this.getFlux().actions.session.modalOpen(<EditYAMLConfig path="genome"/>)}
              iconName="edit"
              label="Edit genome config"
              style={buttonStyle}
            />
          </div>
          : null}
        <Divider />
        {_map(this.config.tables, (table) => (
          <Button
            key={table.id}
            color="primary"
            onClick={() => this.getFlux().actions.session.modalOpen(<EditYAMLConfig path={`tablesById.${table.id}`}/>)}
            iconName="edit"
            label={`Edit ${table.id}`}
            style={buttonStyle}
          />
        ))}
      </div>
    );

    return (
      <Sidebar
        styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
        docked={sidebar}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
              name={sidebar ? 'arrow-left' : 'bars'}
              onClick={() => setProps({sidebar: !sidebar})}
              title={sidebar ? 'Expand' : 'Sidebar'}
            />
            <span className="block text">Status logs</span>
          </div>
          <div className="grow scroll-within">
            <DatasetImportStatusListView refreshMilliseconds={2000} />
          </div>
        </div>
      </Sidebar>
    );

  },
});

export default DatasetManagerActions;
