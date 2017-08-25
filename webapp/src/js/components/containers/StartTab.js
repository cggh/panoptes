import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// Material UI
import ViewList from 'panoptes/ViewList';
import TableList from 'panoptes/TableList';


import HTMLWithComponents from 'panoptes/HTMLWithComponents';

let StartTab = createReactClass({
  displayName: 'StartTab',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: PropTypes.func.isRequired
  },

  icon() {
    return 'home';
  },

  title() {
    return 'Start';
  },

  render() {
    return (
      <div className="horizontal stack start-align">
        <HTMLWithComponents className="grow description">
          {this.config.settings.description}
        </HTMLWithComponents>
        <div className="">
          <ViewList style={{width: '410px'}} />
          <TableList style={{width: '410px'}} />
        </div>
      </div>
    );
  },
});

export default StartTab;
