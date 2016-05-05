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
    if (middleClick)
      this.flux.actions.session.tabOpen(container, props, false);
    else {
      this.flux.actions.session.tabOpen(container, props, true);
    }
  },

  render() {
    return (
      <div className="horizontal stack start-align">
        <HTMLWithComponents className="grow description">
          {this.config.settings.description}
        </HTMLWithComponents>
        <div className="">
          <ViewList style={{width: '410px'}} onClick={this.handleClick} />
          <TableList style={{width: '410px'}} onClick={this.handleClick} />
        </div>
      </div>
    );
  }
});

module.exports = StartTab;
