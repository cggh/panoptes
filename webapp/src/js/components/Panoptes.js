import React from  'react';
import Immutable from 'immutable';
import NotificationSystem from 'react-notification-system';

import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderMixin from 'mixins/PureRenderMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

import TabbedArea from 'ui/TabbedArea';
import TabPane from 'ui/TabPane';
import Popups from 'ui/Popups';
import Popup from 'ui/Popup';
import Modal from 'ui/Modal';
import IconButton from 'material-ui/IconButton';
import getMuiTheme from  'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import {
  blue500, blue700,
  pinkA200,
} from 'material-ui/styles/colors';

import 'font-awesome.css';
import 'ui-components.scss';
import 'main.scss';

let dynreq = require.context('.', true);
const dynamicRequire = (path) => dynreq('./' + path);

const muiTheme = getMuiTheme({
  palette: {
    primary1Color: blue500,
    primary2Color: blue700,
    accent1Color: pinkA200
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
    return {
      session: this.getFlux().store('SessionStore').getState(),
      panoptes: this.getFlux().store('PanoptesStore').getState()
    };
  },

  render() {
    let actions = this.getFlux().actions.session;
    let {tabs, popups, modal, components} = this.state.session.toObject();
    modal = modal.toObject();
    let userID = this.state.panoptes.getIn(['user', 'id']);
    let config = this.getConfig();
    return (
      <MuiThemeProvider muiTheme={muiTheme}>
        <div>
          <div className="loading-container">
            <div className="spinner" />
          </div>
          <div className="page">
            <Header name={config.settings.name} userID={userID} logo={config.logo}/>
            <div className="body">
              <TabbedArea activeTab={tabs.get('selectedTab')}
                          unclosableTab={tabs.get('unclosableTab')}
                          onSwitch={actions.tabSwitch}
                          onClose={actions.tabClose}
                          onAddTab={actions.tabOpen}
                          onDragAway={actions.tabPopOut}
              >
                {tabs.get('components').map((compId) => {
                  let tab = components.get(compId).toObject();
                  let props = tab.props ? tab.props.toObject() : {};
                  props.componentUpdate = actions.componentUpdateFor(compId);
                  return (
                    <TabPane
                      compId={compId}
                      key={compId}>
                      {React.createElement(dynamicRequire(tab.component), props)}
                    </TabPane>
                  );
                })}
              </TabbedArea>
            </div>
          </div>
          <Popups>
            {popups.get('components').map((compId) => {
              let popup = components.get(compId).toObject();
              let props = popup.props ? popup.props.toObject() : {};
              props.componentUpdate = actions.componentUpdateFor(compId);
              let state = popups.getIn(['state', compId]) || Immutable.Map();
              return (
                <Popup
                  {...state.toObject()}
                  compId={compId}
                  key={compId}
                  onMoveStop={actions.popupMove.bind(this, compId)}
                  onResizeStop={actions.popupResize.bind(this, compId)}
                  onClose={actions.popupClose.bind(this, compId)}
                  onMaximise={actions.popupToTab.bind(this, compId)}
                  onClick={actions.popupFocus.bind(this, compId)}>
                  {React.createElement(dynamicRequire(popup.component), props)}
                </Popup>
              );
            })}
          </Popups>
          <Modal visible={modal.component ? true : false}
                 onClose={actions.modalClose}>
            {modal.component ? React.createElement(dynamicRequire(modal.component), modal.props.toObject()) : null}
          </Modal>
          <NotificationSystem ref="notificationSystem"/>
        </div>
        </MuiThemeProvider>
    );
  }
});

let Header = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  render() {
    let {name, userID, logo} = this.props;
    return (
      <div className="header">
        <div className="title">{name}</div>
        <div className="username">{userID}</div>
        <img className="logo" src={logo}/>
        <IconButton tooltip="Help" iconClassName="fa fa-question-circle"/>
        <IconButton tooltip="Find" iconClassName="fa fa-search"/>
        <IconButton tooltip="Link" iconClassName="fa fa-link"/>
      </div>
    );
  }
});

module.exports = Panoptes;
