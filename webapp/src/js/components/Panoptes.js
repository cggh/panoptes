const React = require('react');
const Immutable = require('immutable');
const _ = require('lodash');
const NotificationSystem = require('react-notification-system');

const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const PureRenderMixin = require('mixins/PureRenderMixin');
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
const Colors = require('material-ui/src/styles/colors');
const ColorManipulator = require('material-ui/src/utils/color-manipulator');

const HelloWorld = require('ui/HelloWorld');
const DataTable = require('containers/DataTableWithQuery');
const QueryPicker = require('containers/QueryPicker');


let Panoptes = React.createClass({
  mixins: [
    FluxMixin,
    ConfigMixin,
    PureRenderMixin,
    StoreWatchMixin('LayoutStore', 'PanoptesStore')],

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
    //ThemeManager.setTheme({
    //  getPalette: function() {
    //    return {
    //      primary1Color: Colors.cyan500,
    //      primary2Color: Colors.cyan700,
    //      primary3Color: Colors.cyan100,
    //      accent1Color: Colors.redA200,
    //      accent2Color: Colors.redA400,
    //      accent3Color: Colors.redA100,
    //      textColor: Colors.darkBlack,
    //      canvasColor: Colors.white,
    //      borderColor: Colors.grey300,
    //      disabledColor: ColorManipulator.fade(Colors.darkBlack, 0.3)        };
    //  },
    //  getComponentThemes: function() {}
    //});
    return {
      muiTheme: ThemeManager.getCurrentTheme()
    };
  },

  render() {
    let actions = this.getFlux().actions.layout;
    let {tabs, popups, modal, components} = this.state.layout.toObject();
    modal = modal.toObject();
    let userID = this.state.panoptes.getIn(['user', 'id']);
    let config = this.getConfig();
    return (
      <div>
        <div className="page">
          <div className="header">
            <div className="title">{config.settings.Name}</div>
            <div className="username">{userID}</div>
            <img className="logo" src={config.logo}/>
            <IconButton tooltip="Help" iconClassName="fa fa-question-circle"/>
            <IconButton tooltip="Find" iconClassName="fa fa-search"/>
            <IconButton tooltip="Link" iconClassName="fa fa-link"/>
          </div>
          <div className="body">
            <TabbedArea activeTab={tabs.get('selectedTab')}
                        onSelect={actions.tabSwitch}
                        onClose={actions.tabClose}>
              {tabs.get('components').map(compId => {
                let tab = components.get(compId).toObject();
                let props = tab.props.toObject();
                props.componentUpdate = actions.componentUpdateFor(compId);
                return (
                  <TabPane
                    compId={compId}
                    key={compId}>
                    {React.createElement(require(tab.component), props)}
                  </TabPane>
                )
              })}
            </TabbedArea>
          </div>
        </div>
        <Popups>
          {popups.get('components').map(compId => {
            let popup = components.get(compId).toObject();
            let props = popup.props.toObject();
            props.componentUpdate = actions.componentUpdateFor(compId);
            let state = popups.getIn(['state',compId]) || Immutable.Map();
            return (
              <Popup
                {...state.toObject()}
                compId={compId}
                key={compId}
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
