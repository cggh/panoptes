const React = require('react');
const PureRenderMixin = require('mixins/PureRenderMixin');
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
const Icon = require('ui/Icon');

const HelloWorld = require('ui/HelloWorld');
const DataTable = require('containers/DataTableWithQuery');

let Panoptes = React.createClass({
  mixins: [FluxMixin, PureRenderMixin, StoreWatchMixin('LayoutStore', 'PanoptesStore')],

  componentDidMount() {
    let store = this.getFlux().store('LayoutStore');
    store.on("notify",
      () => this.refs.notificationSystem.addNotification(
        _.extend(store.getLastNotification(), {position: 'tc'})));
    //We don't need this as it will come to us in page load json
    //this.getFlux().actions.api.fetchUser(this.state.panoptes.get('dataset'));
  },

  getStateFromFlux() {
    return {
      layout: this.getFlux().store('LayoutStore').getState(),
      panoptes: this.getFlux().store('PanoptesStore').getState()
    }
  },

  render() {
    let actions = this.getFlux().actions.layout;
    let l_state = this.state.layout.toObject();
    let p_state = this.state.panoptes.toObject();
    let modal = l_state.modal.toObject();
    return (
      <div>
        <div className="page">
          <div className="header">
            <div className="title">{p_state.settings.get('Name')}</div>
            <div className="username">{p_state.userID}</div>
            <img className="logo" src={p_state.logo}/>
            <ButtonToolbar>
              <Button><Icon className='icon' name="question-circle"/></Button>
              <Button><Icon className='icon' name="search"/></Button>
              <Button><Icon className='icon' name="link"/></Button>
            </ButtonToolbar>
          </div>
          <div className="body">
            <TabbedArea activeTab={l_state.tabs.get('selectedTab')}
                        onSelect={actions.tabSwitch}>
              {l_state.tabs.get('components').map(tabId => {
                let tab = l_state.components.get(tabId).toObject();
                let props = tab.props.toObject();
                props.componentUpdate = (newProps) => actions.componentUpdate(tabId, newProps);
                return (
                  <TabPane
                    compId={tabId}
                    key={tabId}
                    title={tab.title}>
                    {React.createElement(require(tab.component), props)}
                  </TabPane>
                )
              })}
            </TabbedArea>
          </div>
        </div>
        <Popups>
          {l_state.popups.get('components').map(popupId => {
            let popup = l_state.components.get(popupId).toObject();
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
    );
  }
});

module.exports = Panoptes;
