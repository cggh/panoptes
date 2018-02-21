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
import Tabs, {Tab} from 'material-ui/Tabs';

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

  handleChangeTab(event, index) {
    let actions = this.getFlux().actions.session;
    let {tabs,  components} = this.state;
    tabs = tabs.toJS();
    components = components.toJS();
    //Filter all the DocPage components to a list
    let docPages = [];
    let others = [];
    tabs.components.forEach((component) => {
      if (component !== 'FirstTab') {
        (this.isDocPage(components[component]) ? docPages : others).push(component);
      }
    });
    if (index === 0) {
      actions.tabSwitch('FirstTab');
    }
    if (index === 1) {
      actions.tabSwitch(docPages[docPages.length - 1]);
    }
    if (index === 2) {
      actions.tabSwitch(others[others.length - 1]);
    }
  },

  render() {
    let actions = this.getFlux().actions.session;
    let {tabs, modal, components} = this.state;
    let config = this.config;
    tabs = tabs.toJS();
    components = components.toJS();
    //Filter all the DocPage components to a list
    let docPages = [];
    let others = [];
    tabs.components.forEach((component) => {
      (this.isDocPage(components[component]) ? docPages : others).push(component);
    });
    let tabIndex = 0;
    let selectedDocPage = 'InitialDocPage';
    let selectedOther = 'InitialOther';
    if (tabs.selectedTab !== 'FirstTab' && docPages.indexOf(tabs.selectedTab) >= 0) {
      tabIndex = 1;
      selectedDocPage = tabs.selectedTab;
    }
    if (others.indexOf(tabs.selectedTab) >= 0) {
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
                logo={initialConfig.logo}
                tabs={tabs}
                components={components}
              />
              <Tabs
                onChange={this.handleChangeTab}
                value={tabIndex}
                indicatorColor="primary"
                textColor="primary"
                centered
              >
                <Tab label="Home" />
                <Tab label="Guidebook" />
                <Tab label="Viewer" />
              </Tabs>
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
