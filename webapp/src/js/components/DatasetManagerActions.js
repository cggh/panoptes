import React from 'react';
import scrollbarSize from 'scrollbar-size';

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

let DatasetManagerActions = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: React.PropTypes.func,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool
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
          <div className="grow">
                <DatasetImportStatusListView refreshMilliseconds={2000} />
          </div>
        </div>
      </Sidebar>
    );
  }
});

export default DatasetManagerActions;
