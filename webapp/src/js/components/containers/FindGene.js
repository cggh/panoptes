import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

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
import Gene from 'containers/Gene';
import ComponentStack from 'containers/ComponentStack';

let FindGene = createReactClass({
  displayName: 'FindGene',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: PropTypes.func,
    replaceSelf: PropTypes.func,
    activeTab: PropTypes.string,
    search: PropTypes.string,
    chromosome: PropTypes.string,
    startPosition: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    endPosition: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    chromosomeLength: PropTypes.number,
  },

  getDefaultProps() {
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

  handleSelectGene(e, geneId, geneDesc) {
    // Add selected geneId to list of recently found genes.
    this.getFlux().actions.session.geneFound(geneId, geneDesc);
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

    let recentlyFoundGenes = <RecentlyFoundGenes onSelect={this.handleSelectGene} subheaderText="Recently found genes" />;

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

  },
});

export default FindGene;
