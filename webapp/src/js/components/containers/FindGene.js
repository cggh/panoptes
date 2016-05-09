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
      activeTab: 'tab_0',
      startPosition: 0
    };
  },

  icon() {
    return 'bitmap:genomebrowser.png';
  },

  title() {
    return 'Find gene';
  },

  render() {
    let {componentUpdate, activeTab, search, chromosome, startPosition, endPosition, chromosomeLength} = this.props;

    // Avoid trying to mutate props.
    let setChromosome = chromosome;
    let setEndPosition = endPosition;
    let setChromosomeLength = chromosomeLength;

    // Set the default chromosome as the first chromosome in this.config.chromosomes
    // NB: this.config is undefined in getInitialstate()
    let defaultChromosome = Object.keys(this.config.chromosomes)[0];

    if ((setChromosome === null || setChromosome === undefined)  && defaultChromosome !== null) {

      let defaultChromosomeLength = parseInt(this.config.chromosomes[defaultChromosome].len);

      setChromosomeLength = defaultChromosomeLength;
      setChromosome = defaultChromosome;

      // Set the default endPosition as the chromosome length
      if (setEndPosition === null || setEndPosition === undefined) {
        setEndPosition = defaultChromosomeLength;
      }

    }

    return (
      <TabbedArea activeTab={activeTab}
                  onSwitch={(id) => componentUpdate({activeTab: id})}>
            <TabPane
              compId={'tab_0'}
              key={'tab_0'}>
                <FindGeneByNameDesc componentUpdate={componentUpdate}
                                    title="Find gene by name / description"
                                    search={search}
                />
            </TabPane>
            <TabPane
              compId={'tab_1'}
              key={'tab_1'}>
                <FindGeneByRegion componentUpdate={componentUpdate}
                                  title="Find gene by region"
                                  chromosome={setChromosome}
                                  startPosition={startPosition}
                                  endPosition={setEndPosition}
                                  chromosomeLength={setChromosomeLength}
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
