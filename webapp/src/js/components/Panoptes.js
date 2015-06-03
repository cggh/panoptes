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
const {Button, ButtonToolbar} = require('react-bootstrap');
const HelloWorld = require('ui/HelloWorld');
const Icon = require('ui/Icon');


let Panoptes = React.createClass({
  mixins: [FluxMixin, StoreWatchMixin('LayoutStore', 'PanoptesStore')],

  componentDidMount() {
    let store = this.getFlux().store('LayoutStore');
    store.on("notify",
      () => this.refs.notificationSystem.addNotification(store.getLastNotification()));
    this.getFlux().actions.api.fetchUser();
  },

  getStateFromFlux() {
    return {
      layout: this.getFlux().store('LayoutStore').getState(),
      panoptes: this.getFlux().store('PanoptesStore').getState()
    }
  },

  render() {
    let actions = this.getFlux().actions.layout;
    let state = this.state.layout;
    let modal = state.get('modal').toObject();
    return (
      <div className="page">
        <div className="header">
          <div className="title">Name of dataset</div>
          <img className="logo" src="http://www.placecage.com/145/20"/>
          <ButtonToolbar>
            <Button><Icon className='icon' name="question-circle"/></Button>
            <Button><Icon className='icon' name="search"/></Button>
            <Button><Icon className='icon' name="link"/></Button>
          </ButtonToolbar>
        </div>
        <div className="body">
          <TabbedArea activeTab={state.getIn(['tabs','selectedTab'])}
                      onSelect={actions.tabSwitch}>
            {state.getIn(['tabs', 'components']).map(tabId => {
              let tab = state.getIn(['components', tabId]).toObject();
              return (
                <TabPane
                  compId={tabId}
                  key={tabId}
                  title={tab.title}>
                  {React.createElement(require(tab.component), tab.props.toObject())}
                </TabPane>
              )
            })}
          </TabbedArea>
          <Popups>
            {state.getIn(['popups', 'components']).map(popupId => {
              let popup = state.getIn(['components', popupId]).toObject();
              return (
                <Popup
                  {...popup}
                  compId={popupId}
                  key={popupId}
                  onMoveStop={actions.popupMove.bind(this, popupId)}
                  onResizeStop={actions.popupResize.bind(this, popupId)}>
                  {React.createElement(require(popup.component), popup.props.toObject())}
                </Popup>
              )
            })}
          </Popups>
          <Modal visible={modal.component ? true : false}
                 onClose={actions.modalClose}>
            {modal.component ? React.createElement(require(modal.component), modal.props.toObject()) : null}
          </Modal>
          <NotificationSystem ref="notificationSystem"/>
        </div>
      </div>
    );
  }
});

module.exports = Panoptes;
