const React = require('react');
const _ = require('lodash');
const NotificationSystem = require('react-notification-system');

const FluxMixin = require('mixins/FluxMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');

const TabbedArea = require('ui/TabbedArea');
const TabPane = require('ui/TabPane');
const Popups = require('ui/Popups');
const Popup = require('ui/Popup');
const Modal = require('ui/Modal');
const HelloWorld = require('ui/HelloWorld');

let Panoptes = React.createClass({
  mixins: [ FluxMixin, StoreWatchMixin('LayoutStore')],

  componentDidMount() {
    let store = this.getFlux().store('LayoutStore');
    store.on("notify",
      () => this.refs.notificationSystem.addNotification(store.getLastNotification()));
  },

  getStateFromFlux() {
    return this.getFlux().store('LayoutStore').getState();
  },

  render() {
    let actions = this.getFlux().actions.layout;
    let state = this.state;
    let modal = this.state.get('modal').toObject();
    return (
      <div>
        <TabbedArea activeTab={state.getIn(['tabs','selectedTab'])}
                    onSelect={actions.tabSwitch}>
          {state.getIn(['tabs','components']).map(tabId => {
            let tab = state.getIn(['components',tabId]).toObject();
            return (
              <TabPane
                compId={tabId}
                key={tabId}
                title={tab.title}>
                  {React.createElement(require(tab.component), tab.props.toObject())}
              </TabPane>
            )})}
        </TabbedArea>
        <Popups>
          {state.getIn(['popups','components']).map(popupId => {
            let popup = state.getIn(['components',popupId]).toObject();
            return (
              <Popup
                {...popup}
                compId={popupId}
                key={popupId}
                onMoveStop={actions.popupMove.bind(this, popupId)}
                onResizeStop={actions.popupResize.bind(this, popupId)}>
                  {React.createElement(require(popup.component), popup.props.toObject())}
              </Popup>
            )})}
        </Popups>
        <Modal visible={modal.component ? true : false}
               onClose={actions.modalClose}>
          {modal.component ? React.createElement(require(modal.component), modal.props.toObject()) : null}
        </Modal>
        <NotificationSystem ref="notificationSystem" />
      </div>
    );
  }

});

module.exports = Panoptes;
