import PropTypes from 'prop-types';
import React from  'react';
import createReactClass from 'create-react-class';
import NotificationSystem from 'react-notification-system';
import deserialiseComponent from 'util/deserialiseComponent'; // NB: deserialiseComponent is actually used.
import _assign from 'lodash.assign';

// Mixins
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderMixin from 'mixins/PureRenderMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

// Panoptes
import Modal from 'ui/Modal';
import SessionComponent from 'panoptes/SessionComponent';
import Header from 'Header';

// Material UI
import createPalette from 'material-ui/styles/createPalette';
import createTypography from 'material-ui/styles/createTypography';
import {createMuiTheme, MuiThemeProvider} from 'material-ui/styles';
import {withTheme} from 'material-ui/styles';
import {deepOrange, blueGrey} from 'material-ui/colors';

// Panoptes utils
import DetectResize from 'utils/DetectResize';

import 'font-awesome.css';
import 'ui-components.scss';
import 'main.scss';

const palette = createPalette({
  primary: deepOrange,
  secondary: blueGrey,
  genotypeRefColor: 'rgb(0, 128, 192)',
  genotypeAltColor: 'rgb(255, 50, 50)',
  genotypeHetColor: 'rgb(0, 192, 120)',
  genotypeNoCallColor: 'rgb(230, 230, 230)'
});

const fontStyle = {
  fontFamily: 'Roboto, sans-serif',
};

const muiTheme = createMuiTheme({
  palette,
  typography: createTypography(palette, fontStyle),
  tableHeaderColumn: {
    height: 56,
    spacing: 12,
    textColor: 'black'
  },
  tableRowColumn: {
    height: 48,
    spacing: 12,
  },
  overrides: {
    MuiListSubheader: {
      sticky: {
        backgroundColor: 'white'
      }
    }
  },
});

let Panoptes = createReactClass({
  displayName: 'Panoptes',

  mixins: [
    FluxMixin,
    ConfigMixin,
    PureRenderMixin,
    StoreWatchMixin('SessionStore', 'PanoptesStore')],

  propTypes: {
    theme: PropTypes.object
  },

  componentDidMount() {
    let store = this.getFlux().store('SessionStore');
    store.on('notify',
      () => this.notificationSystem.addNotification(
        _assign(store.getLastNotification(), {position: 'tc'})));
    //We don't need this as it will come to us in page load json
    //this.getFlux().actions.api.fetchUser(this.state.panoptes.get('dataset'));
    console.info('Theme: %o', this.props.theme);
  },

  getStateFromFlux() {
    let {tabs, popups, components} = this.getFlux().store('SessionStore').getState().toObject();
    return {
      tabs,
      popups,
      components,
      modal: this.getFlux().store('SessionStore').getModal(),
      panoptes: this.getFlux().store('PanoptesStore').getState()
    };
  },

  handleResize() {
    this.getFlux().actions.session.appResize();
  },

  isDocPage(component) {
    return component.type === 'DocPage' ||  component.type ===  'DataItem';
  },

  isViewerDocPage(component) {
    return (this.isDocPage(component) && component.props !== undefined && component.props.path !== undefined && component.props.path.startsWith('viewers/'));
  },

  isNonViewerDocPage(component) {
    return (this.isDocPage(component) && !this.isViewerDocPage(component));
  },

  separateNonViewerDocPagesFromOtherComponents(tabComponents, components) {
    let nonViewerDocPageComponents = [];
    let otherComponents = [];
    tabComponents.forEach((component) => {
      if (component !== 'FirstTab') {
        (this.isNonViewerDocPage(components[component]) ? nonViewerDocPageComponents : otherComponents).push(component);
      }
    });
    return {nonViewerDocPageComponents, otherComponents};
  },

  handleChangeTab(event, index) {
    let actions = this.getFlux().actions.session;
    let {tabs,  components} = this.state;
    tabs = tabs.toJS();
    components = components.toJS();
    const {nonViewerDocPageComponents, otherComponents} = this.separateNonViewerDocPagesFromOtherComponents(tabs.components, components);
    if (index === 0) {
      actions.tabSwitch('FirstTab');
    }
    if (index === 1) {
      actions.tabSwitch(nonViewerDocPageComponents[nonViewerDocPageComponents.length - 1]);
    }
    if (index === 2) {
      actions.tabSwitch(otherComponents[otherComponents.length - 1]);
    }
  },

  render() {
    let actions = this.getFlux().actions.session;
    let {tabs, modal, components} = this.state;
    let config = this.config;
    tabs = tabs.toJS();
    components = components.toJS();
    const {nonViewerDocPageComponents, otherComponents} = this.separateNonViewerDocPagesFromOtherComponents(tabs.components, components);

    let tabIndex = undefined;
    let selectedDocPage = undefined;
    let selectedOther = undefined;

    if (tabs.selectedTab === 'FirstTab') {
      tabIndex = 0;
    } else if (tabs.selectedTab === 'InitialDocPage') {
      tabIndex = 1;
      selectedDocPage = 'InitialDocPage';
    } else if (nonViewerDocPageComponents.indexOf(tabs.selectedTab) !== -1) {
      tabIndex = 1;
      selectedDocPage = tabs.selectedTab;
    } else if (tabs.selectedTab === 'InitialOther') {
      tabIndex = 2;
      selectedOther = 'InitialOther';
    } else if (otherComponents.indexOf(tabs.selectedTab) !== -1) {
      tabIndex = 2;
      selectedOther = tabs.selectedTab;
    }

    // NB: initialConfig is actually defined (in index.html)
    return (
      <DetectResize onResize={this.handleResize}>
        <MuiThemeProvider theme={muiTheme}>
          <div>
            <div className="loading-container">
              <div className="spinner" />
            </div>
            <div className="page">
              <Header
                dataset={config.dataset}
                name={config.settings.nameBanner}
                version={config.settings.version}
                logo={initialConfig.logo}
                tabs={tabs}
                components={components}
                tabIndex={tabIndex}
                onTabChange={this.handleChangeTab}
              />
              {tabIndex === 0 ?
                <div className="body scroll-within">
                  <SessionComponent key="FirstTab" compId={'FirstTab'} />
                </div> : null}
              {tabIndex === 1 ?
                <div className="body scroll-within">
                  <SessionComponent key={selectedDocPage} compId={selectedDocPage} />
                </div> : null}
              {tabIndex === 2 ?
                <div className="body scroll-within">
                  <SessionComponent key={selectedOther} compId={selectedOther} />
                </div> : null}
            </div>
            <Modal visible={!!modal}
              onClose={actions.modalClose}>
              {modal ?
                React.cloneElement(modal, {setProps: actions.modalSetProps})
                : null}
            </Modal>
            <NotificationSystem ref={(input) => { this.notificationSystem = input; }}/>
          </div>
        </MuiThemeProvider>
      </DetectResize>
    );
  },
});

export default withTheme()(Panoptes);
