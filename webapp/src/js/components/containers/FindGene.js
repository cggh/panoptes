import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

// UI components
import TabbedArea from 'ui/TabbedArea';
import TabPane from 'ui/TabPane';

// Containers
import FindGeneByNameDesc from 'containers/FindGeneByNameDesc';
import FindGeneByRegion from 'containers/FindGeneByRegion';
import RecentlyFoundGenes from 'containers/RecentlyFoundGenes';
import Gene from 'containers/Gene';
import ComponentStack from 'containers/ComponentStack';

let FindGene = React.createClass({
  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    StoreWatchMixin('SessionStore')
  ],

  propTypes: {
    setProps: React.PropTypes.func,
    replaceSelf: React.PropTypes.func,
    activeTab: React.PropTypes.string,
    search: React.PropTypes.string,
    chromosome: React.PropTypes.string,
    startPosition: React.PropTypes.number,
    endPosition: React.PropTypes.number,
    chromosomeLength: React.PropTypes.number,
  },

  getDefaultProps: function() {
    return {
      activeTab: 'tab_0',
      startPosition: 0
    };
  },

  getStateFromFlux() {
    return {
      foundGenes: this.getFlux().store('SessionStore').getState().get('foundGenes')
    };
  },

  icon() {
    return 'bitmap:genomebrowser.png';
  },

  title() {
    return 'Find gene';
  },

  handleSelectGene(e, geneId) {
    // Add selected geneId to list of recently found genes.
    this.getFlux().actions.session.geneFound(geneId);
    const component = <Gene geneId={geneId} />;
    const middleClick =  e.button == 1 || e.metaKey || e.ctrlKey;
    if (middleClick)
      this.flux.actions.session.popupOpen(component, false);
    else {
      this.props.replaceSelf(component);
    }
  },

  render() {
    let {setProps, activeTab, search, chromosome, startPosition, endPosition, chromosomeLength} = this.props;
    let {foundGenes} = this.state;

    // Avoid trying to mutate props.
    let setChromosome = chromosome;
    let setEndPosition = endPosition;
    let setChromosomeLength = chromosomeLength;

    // Set the default chromosome as the first chromosome in this.config.chromosomes
    // NB: this.config is undefined in getInitialstate()
    let defaultChromosome = Object.keys(this.config.chromosomes)[0];

    if ((setChromosome === null || setChromosome === undefined)  && defaultChromosome !== null) {

      let defaultChromosomeLength = parseInt(this.config.chromosomes[defaultChromosome]);

      setChromosomeLength = defaultChromosomeLength;
      setChromosome = defaultChromosome;

      // Set the default endPosition as the chromosome length
      if (setEndPosition === null || setEndPosition === undefined) {
        setEndPosition = defaultChromosomeLength;
      }

    }

    let recentlyFoundGenes = null;
    if (foundGenes.size > 0) {
      recentlyFoundGenes = (
        <div style={{borderTop: '4px solid #3d8bd5'}}>
          <RecentlyFoundGenes onSelect={this.handleSelectGene} subheaderText="Recently found genes" />
        </div>
      );
    }

    return (
      <TabbedArea activeTab={activeTab}
                  onSwitch={(id) => setProps({activeTab: id})}>
            <TabPane
              compId={'tab_0'}
              key={'tab_0'}
            >
                <ComponentStack title="Find gene by name / description">
                  <FindGeneByNameDesc
                    setProps={setProps}
                    onSelect={this.handleSelectGene}
                    search={search}
                  />
                  {recentlyFoundGenes}
                </ComponentStack>
            </TabPane>
            <TabPane
              compId={'tab_1'}
              key={'tab_1'}>
                <ComponentStack title="Find gene by region">
                  <FindGeneByRegion
                    setProps={setProps}
                    onSelect={this.handleSelectGene}
                    chromosome={setChromosome}
                    startPosition={startPosition}
                    endPosition={setEndPosition}
                    chromosomeLength={setChromosomeLength}
                  />
                  {recentlyFoundGenes}
                </ComponentStack>
            </TabPane>
            <TabPane
              compId={'tab_2'}
              key={'tab_2'}>
                <RecentlyFoundGenes
                  onSelect={this.handleSelectGene}
                  title="Recently found genes"
                />
            </TabPane>
      </TabbedArea>
    );

  }

});

module.exports = FindGene;
