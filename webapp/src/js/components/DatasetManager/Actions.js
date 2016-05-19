import React from 'react';
import Immutable from 'immutable';
import scrollbarSize from 'scrollbar-size';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import Sidebar from 'react-sidebar';

// UI components
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import TabbedArea from 'ui/TabbedArea';
import TabPane from 'ui/TabPane';
import ConfirmButton from 'ui/ConfirmButton';


// Material UI components
import FlatButton from 'material-ui/FlatButton';

// Panoptes components
import DatasetImportStatusView from 'DatasetImportStatus/View';
import API from 'panoptes/API';

let DatasetManagerActions = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool
  },

  icon() {
    return 'database';
  },

  title() {
    return this.props.title || 'Dataset manager';
  },

  handleReloadConfig() {
console.log('handleReloadConfig');
  },

  handleReimport() {
    API.importDataset(this.config.dataset);
  },

  render() {
    let {sidebar, componentUpdate} = this.props;

    if (!this.config.isManager) {
      console.error('!this.config.isManager');
      return null;
    }

    let sidebarContent = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()} description={'Import and configure the ' + this.config.settings.name + ' dataset'} />
        <ConfirmButton label="Reload config only"
                       primary={true}
                       icon={<Icon fixedWidth={true} name={'cogs'} />}
                       message={'Are you sure you want to reload the configuration for the ' + this.config.settings.name + ' dataset?'}
                       onConfirm={() => this.handleReloadConfig()}
        />
        <ConfirmButton label="Reimport everything"
                       primary={true}
                       icon={<Icon fixedWidth={true} name={'refresh'} />}
                       message={'Are you sure you want to reimport everything for the ' + this.config.settings.name + ' dataset?'}
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
                  name={sidebar ? 'arrows-h' : 'bars'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}
                  title={sidebar ? 'Expand' : 'Sidebar'}
            />
            <span className="block text">Status logs</span>
          </div>
          <div className="grow">
                <DatasetImportStatusView foo="bar" />
          </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = DatasetManagerActions;
