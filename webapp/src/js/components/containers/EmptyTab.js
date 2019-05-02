import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

import ViewList from 'panoptes/ViewList';
import TableList from 'panoptes/TableList';

let EmptyTab = createReactClass({
  displayName: 'EmptyTab',

  mixins: [
    PureRenderMixin,
    FluxMixin
  ],

  propTypes: {
    replaceSelf: PropTypes.func
  },

  icon() {
    return 'folder';
  },

  title() {
    return 'New tab';
  },

  handleClick({component, middleClick}) {
    if (middleClick)
      this.flux.actions.session.tabOpen(component, false);
    else {
      this.props.replaceSelf(component);
    }
  },

  render() {
    return (
      <div className="horizontal stack start-align wrap">
        <ViewList style={{width: '500px'}} onClick={this.handleClick} />
        <TableList style={{width: '500px'}} onClick={this.handleClick} />
      </div>
    );
  },
});

export default EmptyTab;
