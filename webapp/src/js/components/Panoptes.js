import PropTypes from 'prop-types';
import React from  'react';
import createReactClass from 'create-react-class';
import NotificationSystem from 'react-notification-system';
import deserialiseComponent from 'util/deserialiseComponent'; // NB: deserialiseComponent is actually used.
import {Map} from 'immutable';
import _assign from 'lodash.assign';

// Mixins
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderMixin from 'mixins/PureRenderMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

// Panoptes
import TabbedArea from 'ui/TabbedArea';
import TabPane from 'ui/TabPane';
import Popups from 'ui/Popups';
import Popup from 'ui/Popup';
import Modal from 'ui/Modal';
import Finder from 'containers/Finder';
import Copy from 'ui/Copy';
import Confirm from 'ui/Confirm';
import SessionComponent from 'panoptes/SessionComponent';
import HTMLWithComponents from 'panoptes/HTMLWithComponents';

// Material UI
import IconButton from '@material-ui/core/IconButton';
// import MuiThemeProvider from '@material-ui/core/styles/MuiThemeProvider';
// import createMuiTheme from '@material-ui/core/styles/createMuiTheme';
import createPalette from '@material-ui/core/styles/createPalette';
import createTypography from '@material-ui/core/styles/createTypography';
import {createMuiTheme, MuiThemeProvider} from '@material-ui/core/styles';
import {withTheme} from '@material-ui/core/styles';
import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap.css';

//https://github.com/facebook/flow/issues/380
import {blue, pink} from '@material-ui/core/colors';
import {A200 as pinkA200} from '@material-ui/core/colors/pink';
//import red from '@material-ui/core/colors/red';

// Panoptes utils
import DetectResize from 'utils/DetectResize';

import 'font-awesome.css';
import 'ui-components.scss';
import 'main.scss';

const palette = createPalette({
  primary: blue,
  accent: pink,
  primary1Color: blue[500],
  primary2Color: blue[700],
  accent1Color: pinkA200,
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
  }
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
      () => this.refs.notificationSystem.addNotification(
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

  render() {
    let actions = this.getFlux().actions.session;
    let {tabs, popups, modal} = this.state;
    let config = this.config;
    // NB: initialConfig is actually defined (in index.html)
    return (
      <DetectResize onResize={this.handleResize}>
        <MuiThemeProvider theme={muiTheme}>
          <div>
            <div className="loading-container">
              <div className="spinner" />
            </div>
            <div className="page">
              <Header dataset={config.dataset} name={config.settings.nameBanner} logo={initialConfig.logo}/>
              <div className="body">
                <TabbedArea activeTab={tabs.get('selectedTab')}
                  unclosableTabs={tabs.get('unclosableTabs')}
                  unreplaceableTabs={tabs.get('unreplaceableTabs')}
                  onSwitch={actions.tabSwitch}
                  onClose={actions.tabClose}
                  onAddTab={actions.tabOpen}
                  onDragAway={actions.tabPopOut}
                >
                  {tabs.get('components').map((compId) =>
                    <TabPane
                      compId={compId}
                      key={compId}>
                      <SessionComponent compId={compId} />
                    </TabPane>
                  ).toArray()}
                </TabbedArea>
              </div>
            </div>
            <Popups>
              {popups.get('components').map((compId) => {
                let state = popups.getIn(['state', compId]);
                let {x, y} = state.get('position', Map()).toJS();
                let {width, height} = state.get('size', Map()).toJS();
                return (
                  <Popup
                    initialX={x}
                    initialY={y}
                    initialWidth={width}
                    initialHeight={height}
                    compId={compId}
                    key={compId}
                    onMoveStop={actions.popupMove.bind(this, compId)}
                    onResizeStop={actions.popupResize.bind(this, compId)}
                    onClose={actions.popupClose.bind(this, compId)}
                    onMaximise={actions.popupToTab.bind(this, compId)}
                    onClick={actions.popupFocus.bind(this, compId)}>
                    <SessionComponent compId={compId} />
                  </Popup>
                );
              }).toArray()}
            </Popups>
            <Modal visible={modal ? true : false}
              onClose={actions.modalClose}>
              {modal ?
                React.cloneElement(modal, {setProps: actions.modalSetProps})
                : null}
            </Modal>
            <NotificationSystem ref="notificationSystem"/>
          </div>
        </MuiThemeProvider>
      </DetectResize>
    );
  },
});

let Header = createReactClass({
  displayName: 'Header',

  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin,
  ],

  propTypes: {
    dataset: PropTypes.string,
    name: PropTypes.string,
    logo: PropTypes.string
  },

  handlePageLinkClick() {
    let introContent = 'Here\'s the link for this page, which you can copy and paste elsewhere: ';
    let selectedContent = window.location.href;
    this.getFlux().actions.session.modalOpen(<Copy title="Page Link" introContent={introContent} selectedContent={selectedContent}/>);
  },

  handleSaveInitialSession() {
    let state = this.getFlux().store('SessionStore').getState().toJS();
    this.getFlux().actions.session.modalOpen(<Confirm
      title="Initial view"
      message="Save current app state as initial view for all users?"
      onConfirm={() => this.getFlux().actions.api.modifyConfig(
        {
          dataset: this.config.dataset,
          path: 'settings.initialSessionState',
          action: 'replace',
          content: state,
        }
      )}
    />);
  },

  render() {
    let {dataset, name, logo} = this.props;
    let actions = this.getFlux().actions;
    const userId = this.config.user.id;
    return (
      <div className="header">
        <div className="title"><a href={`/panoptes/${dataset}`}><HTMLWithComponents>{name}</HTMLWithComponents></a></div>
        <div className="username">
          { this.config.cas.service ? (userId == 'anonymous' ?
            <a href={`${this.config.cas.service}?service=${window.location.href}`}>Login</a>
            : <span>
              {userId}
              <a className="logout" href={this.config.cas.logout}>logout</a>
            </span>) : null
          }
        </div>
        <img className="logo" src={logo}/>
        {this.config.user.isManager ?
          <Tooltip
            overlay="Set current state as initial view for all users"
            placement="bottom"
          >
            <IconButton
              className="fa fa-floppy-o"
              onClick={this.handleSaveInitialSession}
            />
          </Tooltip>
          : null
        }
        <Tooltip
          overlay="Find"
          placement="bottom"
        >
          <IconButton
            className="fa fa-search"
            onClick={() => actions.session.modalOpen(<Finder />)}
          />
        </Tooltip>
        <Tooltip
          overlay="Link"
          placement="bottom"
        >
          <IconButton
            className="fa fa-link"
            onClick={this.handlePageLinkClick}
          />
        </Tooltip>
      </div>
    );
  },
});

Panoptes = withTheme()(Panoptes);
Panoptes.displayName = "Panoptes";
export default Panoptes;
