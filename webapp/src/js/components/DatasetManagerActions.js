import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import scrollbarSize from 'scrollbar-size';
import EditYAMLConfig from 'panoptes/EditYAMLConfig';
import FlatButton from 'material-ui/FlatButton';
import _map from 'lodash.map';
import Divider from 'material-ui/Divider';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import Sidebar from 'ui/Sidebar';

// UI components
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import ConfirmButton from 'ui/ConfirmButton';
import Loading from 'ui/Loading';

// Panoptes components
import DatasetImportStatusListView from 'DatasetImportStatus/ListView';
import API from 'panoptes/API';

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
    let sidebarContent = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()} description={`Import and configure the ${name} (${dataset}) dataset`} />
        <ConfirmButton label="Reimport everything"
          primary={true}
          icon={<Icon fixedWidth={true} name={'refresh'} />}
          message={`Are you sure you want to reimport everything for the ${name} (${dataset}) dataset?`}
          onConfirm={() => this.handleReimport()}
        />
        <FlatButton label={'Edit dataset config'}
          primary={true}
          onClick={() => this.getFlux().actions.session.modalOpen(<EditYAMLConfig path="settings"/>)}
          icon={<Icon fixedWidth={true} name={'edit'} />}
        />
        {this.config.genome !== null ?
          <div>
            <Divider />
            <FlatButton label={'Edit genome config'}
              primary={true}
              onClick={() => this.getFlux().actions.session.modalOpen(<EditYAMLConfig path="genome"/>)}
              icon={<Icon fixedWidth={true} name={'edit'} />}
            />
          </div>
          : null}
        <Divider />
        {_map(this.config.tables, (table) => (
          <FlatButton label={`Edit ${table.id}`}
            primary={true}
            onClick={() => this.getFlux().actions.session.modalOpen(<EditYAMLConfig path={`tablesById.${table.id}`}/>)}
            icon={<Icon fixedWidth={true} name={'edit'} />}
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
