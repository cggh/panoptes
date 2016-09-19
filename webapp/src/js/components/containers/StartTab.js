import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// Material UI
import ViewList from 'panoptes/ViewList';
import TableList from 'panoptes/TableList';


import HTMLWithComponents from 'panoptes/HTMLWithComponents';

let StartTab = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: React.PropTypes.func.isRequired
  },

  icon() {
    return 'home';
  },
  title() {
    return 'Start';
  },

  handleClick({component, middleClick}) {
    if (middleClick)
      this.flux.actions.session.tabOpen(component, false);
    else {
      this.flux.actions.session.tabOpen(component, true);
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
