import React from  'react';
import Immutable from 'immutable';
import _ from 'lodash';
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
import mui from 'material-ui';
import {IconButton} from 'material-ui';
import Colors from 'material-ui/lib/styles/colors';
import ThemeManager from  'material-ui/lib/styles/theme-manager';
import RawTheme from 'material-ui/lib/styles/raw-themes/light-raw-theme';
import ColorManipulator from 'material-ui/lib/utils/color-manipulator';

import Icon from 'ui/Icon';

import 'font-awesome.css';
import 'ui-components.scss';
import 'main.scss';

let dynreq = require.context('.', true);
const dynamic_require = (path) => dynreq('./' + path);

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
        _.extend(store.getLastNotification(), {position: 'tc'})));
    //We don't need this as it will come to us in page load json
    //this.getFlux().actions.api.fetchUser(this.state.panoptes.get('dataset'));
  },

  getStateFromFlux() {
    return {
      session: this.getFlux().store('SessionStore').getState(),
      panoptes: this.getFlux().store('PanoptesStore').getState()
    };
  },

  childContextTypes: {
    muiTheme: React.PropTypes.object
  },

  getChildContext() {
    return {
      muiTheme: ThemeManager.getMuiTheme(RawTheme)
    };
  },


  render() {
    let actions = this.getFlux().actions.session;
    let {tabs, popups, modal, components} = this.state.session.toObject();
    modal = modal.toObject();
    let userID = this.state.panoptes.getIn(['user', 'id']);
    let config = this.getConfig();
    return (
      <div>
        <div className="page">
          <div className="header">
            <div className="title">{config.settings.name}</div>
            <div className="username">{userID}</div>
            <img className="logo" src={config.logo}/>
            <IconButton tooltip="Help" iconClassName="fa fa-question-circle"/>
            <IconButton tooltip="Find" iconClassName="fa fa-search"/>
            <IconButton tooltip="Link" iconClassName="fa fa-link"/>
          </div>
          <div className="body">
            <TabbedArea activeTab={tabs.get('selectedTab')}
                        onSwitch={actions.tabSwitch}
                        onClose={actions.tabClose}
                        onAddTab={actions.tabOpen}
                        onDragAway={actions.tabPopOut}
              >
              {tabs.get('components').map(compId => {
                let tab = components.get(compId).toObject();
                let props = tab.props ? tab.props.toObject() : {};
                props.componentUpdate = actions.componentUpdateFor(compId);
                return (
                  <TabPane
                    compId={compId}
                    key={compId}>
                    {React.createElement(dynamic_require(tab.component), props)}
                  </TabPane>
                );
              })}
            </TabbedArea>
          </div>
        </div>
        <Popups>
          {popups.get('components').map(compId => {
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
                onClick={actions.popupFocus.bind(this, compId)}>
                {React.createElement(dynamic_require(popup.component), props)}
              </Popup>
            );
          })}
        </Popups>
        <Modal visible={modal.component ? true : false}
               onClose={actions.modalClose}>
          {modal.component ? React.createElement(dynamic_require(modal.component), modal.props.toObject()) : null}
        </Modal>
        <NotificationSystem ref="notificationSystem"/>
      </div>
    );
  }
});

module.exports = Panoptes;
