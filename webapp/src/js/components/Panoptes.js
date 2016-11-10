import React from  'react';
import NotificationSystem from 'react-notification-system';
import deserialiseComponent from 'util/deserialiseComponent';
import {Map} from 'immutable';
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

// Material UI
import IconButton from 'material-ui/IconButton';
import getMuiTheme from  'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import {
  blue500, blue700,
  pinkA200,
} from 'material-ui/styles/colors';

// Panoptes utils
import DetectResize from 'utils/DetectResize';

import 'font-awesome.css';
import 'ui-components.scss';
import 'main.scss';

const muiTheme = getMuiTheme({
  palette: {
    primary1Color: blue500,
    primary2Color: blue700,
    accent1Color: pinkA200,
    genotypeRefColor: 'rgb(0, 128, 192)',
    genotypeAltColor: 'rgb(255, 50, 50)',
    genotypeHetColor: 'rgb(0, 192, 120)',
    genotypeNoCallColor: 'rgb(230, 230, 230)'
  }
});

let Panoptes = React.createClass({
  mixins: [
    FluxMixin,
    ConfigMixin,
    PureRenderMixin,
    StoreWatchMixin('SessionStore', 'PanoptesStore')],

  componentDidMount() {
    let store = this.getFlux().store('SessionStore');
    store.on('notify',
      () => this.refs.notificationSystem.addNotification(
        Object.assign(store.getLastNotification(), {position: 'tc'})));
    //We don't need this as it will come to us in page load json
    //this.getFlux().actions.api.fetchUser(this.state.panoptes.get('dataset'));
  },

  getStateFromFlux() {
    let {tabs, popups} = this.getFlux().store('SessionStore').getState().toObject();
    return {
      tabs,
      popups,
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
    let userID = this.state.panoptes.getIn(['user', 'id']);
    let config = this.config;
    // NB: initialConfig is defined in index.html
    return (
      <DetectResize onResize={this.handleResize}>
        <MuiThemeProvider muiTheme={muiTheme}>
          <div>
            <div className="loading-container">
              <div className="spinner" />
            </div>
            <div className="page">
              <Header dataset={config.dataset} name={config.settings.name} userID={userID} logo={initialConfig.logo}/>
              <div className="body">
                <TabbedArea activeTab={tabs.get('selectedTab')}
                            unclosableTab={tabs.get('unclosableTab')}
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
                    x={x}
                    y={y}
                    width={width}
                    height={height}
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
  }
});

let Header = React.createClass({
  mixins: [
    PureRenderMixin,
    ConfigMixin,
    FluxMixin,
  ],

  propTypes: {
    dataset: React.PropTypes.string,
    name: React.PropTypes.string,
    userID: React.PropTypes.string,
    logo: React.PropTypes.string
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
    let {dataset, name, userID, logo} = this.props;
    let actions = this.getFlux().actions;
    // TODO: <IconButton tooltip="Help" iconClassName="fa fa-question-circle"/>
    return (
      <div className="header">
        <div className="title"><a href={`/panoptes/${dataset}`}>{name}</a></div>
        <div className="username">{userID}</div>
        <img className="logo" src={logo}/>
        {this.config.user.isManager ?
          <IconButton tooltip="Set current state as initial view for all users"
                      iconClassName="fa fa-floppy-o"
                      onClick={this.handleSaveInitialSession}
          /> : null}

        <IconButton tooltip="Find"
                    iconClassName="fa fa-search"
                    onClick={() => actions.session.modalOpen(<Finder />)}
        />
        <IconButton
          tooltip="Link"
          iconClassName="fa fa-link"
          onClick={this.handlePageLinkClick}
        />
      </div>
    );
  }
});

module.exports = Panoptes;
