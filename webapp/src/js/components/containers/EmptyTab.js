import _map from 'lodash/map';
import React from 'react';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

import List from 'material-ui/lib/lists/list';
import ListItem from 'material-ui/lib/lists/list-item';
import Subheader from 'material-ui/lib/Subheader';
import Icon from 'ui/Icon';
import ViewList from 'panoptes/ViewList';
import TableList from 'panoptes/TableList';

let EmptyTab = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired
  },

  icon() {
    return 'folder-o';
  },
  title() {
    return 'New tab';
  },

  handleClick({container, props, middleClick}) {
    if (middleClick)
      this.flux.actions.session.tabOpen(container, props, false);
    else {
      this.props.componentUpdate(props, container);
    }
  },


  render() {
    return (
      <div className="horizontal stack start-align wrap">
        <ViewList style={{width: '500px'}} onClick={this.handleClick} />
        <TableList style={{width: '500px'}} onClick={this.handleClick} />
      </div>
    );
  }
});

module.exports = EmptyTab;
