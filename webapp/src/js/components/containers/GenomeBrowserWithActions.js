import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PureRenderMixin from 'mixins/PureRenderMixin';

import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import Sidebar from 'react-sidebar';
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import GenomeBrowser from 'panoptes/genome/GenomeBrowser';

import FlatButton from 'material-ui/lib/flat-button';


let GenomeBrowserWithActions = React.createClass({
  mixins: [PureRenderMixin, FluxMixin, ConfigMixin],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    chromosome: React.PropTypes.string,
    start: React.PropTypes.number,
    end: React.PropTypes.number,
    components: ImmutablePropTypes.orderedMap
  },

  getDefaultProps() {
    return {
      componentUpdate: null,
      sidebar: true,
      chromosome: '',
      start: 0,
      end: 10000,
      components: Immutable.OrderedMap()
    };
  },

  componentWillMount() {
  },

  icon() {
    return 'bitmap:genomebrowser.png';
  },

  title() {
    return this.props.title || 'Genome Browser';
  },

  render() {
    let {sidebar, componentUpdate, ...subProps} = this.props;
    let sidebarContent = (
      <div className="sidebar">
        <SidebarHeader icon={this.icon()} description="A browser for exploring the reference genome and per-sample data including coverage and mapping qualities."/>
        <FlatButton label="Add Channel"
                    primary={true}
                    onClick={null}/>
      </div>
    );
    return (
      <Sidebar
        docked={sidebar}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'arrow-left' : 'bars'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}/>
            <span className="text">WTF</span>
          </div>
          <GenomeBrowser componentUpdate={componentUpdate} sideWidth={100} {...subProps} />
        </div>
      </Sidebar>
    );
  }
});

module.exports = GenomeBrowserWithActions;
