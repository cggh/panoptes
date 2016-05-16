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

// Material UI components
// TODO BUTTON import TextField from 'material-ui/TextField';

// Panoptes components
import SQL from 'panoptes/SQL';


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
    return this.props.title || 'Dataset Manager';
  },

  render() {
    let {sidebar, componentUpdate} = this.props;
    let description = 'description goes here';

    let sidebarContent = (
      <div className="sidebar">
        <div className="item-picker">
          <SidebarHeader icon={this.icon()} description={description}/>
          <p>hello</p>
        </div>
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
            <p>hello again</p>
          </div>
          <div>
            <p>hello once more</p>
          </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = DatasetManagerActions;
