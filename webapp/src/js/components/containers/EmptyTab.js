import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

import ViewList from 'panoptes/ViewList';
import TableList from 'panoptes/TableList';
import ConfigMixin from 'mixins/ConfigMixin';
import DocPage from "panoptes/DocPage";

let EmptyTab = createReactClass({
  displayName: 'EmptyTab',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
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
      return <DocPage path='index.html'/>;
  }
});

export default EmptyTab;
