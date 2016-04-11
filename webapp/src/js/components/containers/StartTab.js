import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// Material UI
import ViewList from 'panoptes/ViewList';
import TableList from 'panoptes/TableList';

import Icon from 'ui/Icon';

import HTMLWithComponents from 'panoptes/HTMLWithComponents';

import 'start-tab.scss';

let StartTab = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired
  },

  icon() {
    return 'home';
  },
  title() {
    return 'Start';
  },

  handleClick({container, props, middleClick}) {
    this.flux.actions.tabOpen(container, props, middleClick);
  },

  render() {
    return (
      <div className="horizontal stack start-align">
        <HTMLWithComponents className="grow description">
          {this.config.settings.description}
        </HTMLWithComponents>
        <div className="" >
          <ViewList style={{width: '400px'}} onClick={this.handleClick} />
          <TableList style={{width: '400px'}} onClick={this.handleClick} />
        </div>
      </div>
    );
  }
});

module.exports = StartTab;
