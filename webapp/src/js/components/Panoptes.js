const React = require('react');
const Immutable = require('immutable');
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
const mui = require('material-ui');
const {IconButton} = mui;
const ThemeManager = new mui.Styles.ThemeManager();
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

  childContextTypes: {
    muiTheme: React.PropTypes.object
  },

  getChildContext() {
    return {
      muiTheme: ThemeManager.getCurrentTheme()
    };
  },

  render() {
    let actions = this.getFlux().actions.layout;
    let l_state = this.state.layout.toObject();
    let p_state = this.state.panoptes.toObject();
    let modal = l_state.modal.toObject();
    let iconStyle = {color:'white'};
    return (
      <div>
        <div className="page">
          <div className="header">
            <div className="title">{p_state.settings.get('Name')}</div>
            <div className="username">{p_state.userID}</div>
            <img className="logo" src={p_state.logo}/>
            <IconButton tooltip="Help" iconClassName="fa fa-question-circle"/>
            <IconButton tooltip="Find" iconClassName="fa fa-search"/>
            <IconButton tooltip="Link" iconClassName="fa fa-link"/>
          </div>
          <div className="body">
            <TabbedArea activeTab={l_state.tabs.get('selectedTab')}
                        onSelect={actions.tabSwitch}
                        onClose={actions.tabClose}>
              {l_state.tabs.get('components').map(compId => {
                let tab = l_state.components.get(compId).toObject();
                let props = tab.props.toObject();
                props.componentUpdate = actions.componentUpdateFor(compId);
                return (
                  <TabPane
                    compId={compId}
                    key={compId}
                    title={tab.title}>
                    {React.createElement(require(tab.component), props)}
                  </TabPane>
                )
              })}
            </TabbedArea>
          </div>
        </div>
        <Popups>
          {l_state.popups.get('components').map(compId => {
            let popup = l_state.components.get(compId).toObject();
            let props = popup.props.toObject();
            props.componentUpdate = actions.componentUpdateFor(compId);
            let state = l_state.popups.getIn(['state',compId]) || Immutable.Map();
            return (
              <Popup
                {...state.toObject()}
                compId={compId}
                key={compId}
                faIcon={popup.faIcon}
                title={popup.title}
                onMoveStop={actions.popupMove.bind(this, compId)}
                onResizeStop={actions.popupResize.bind(this, compId)}
                onClose={actions.popupClose.bind(this, compId)}
                onClick={actions.popupFocus.bind(this, compId)}>
                {React.createElement(require(popup.component), props)}
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
