import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import _isFunction from 'lodash/isFunction';


// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// UI components
import TabbedArea from 'ui/TabbedArea';
import TabPane from 'ui/TabPane';

// Containers
import FindGeneByNameDesc from 'containers/FindGeneByNameDesc';
import FindGeneByRegion from 'containers/FindGeneByRegion';
import RecentlyFoundGenes from 'containers/RecentlyFoundGenes';

let FindGene = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    activeTab: React.PropTypes.string
  },

  getDefaultProps: function() {
    return {
      activeTab: 'tab_0'
    };
  },

  icon() {
    return 'bitmap:genomebrowser.png';
  },

  title() {
    return 'Find gene';
  },

  render() {
    let {componentUpdate, activeTab} = this.props;
    return (
      <TabbedArea activeTab={activeTab}
                  onSwitch={(id) => componentUpdate({activeTab: id})}>
            <TabPane
              compId={'tab_0'}
              key={'tab_0'}>
                <FindGeneByNameDesc componentUpdate={componentUpdate}
                                    title="Find gene by name / description"
                />
            </TabPane>
            <TabPane
              compId={'tab_1'}
              key={'tab_1'}>
                <FindGeneByRegion componentUpdate={componentUpdate}
                                  title="Find gene by region"
                />
            </TabPane>
            <TabPane
              compId={'tab_2'}
              key={'tab_2'}>
                <RecentlyFoundGenes componentUpdate={componentUpdate}
                                  title="Recently found genes"
                />
            </TabPane>
      </TabbedArea>
    );

  }

});

module.exports = FindGene;
