import React from  'react';
import NotificationSystem from 'react-notification-system';
import deserialiseComponent from 'util/deserialiseComponent'; // NB: deserialiseComponent is actually used.
import {Map} from 'immutable';
import _assign from 'lodash/assign';

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
import DatasetManagerActions from 'DatasetManagerActions';
import EmptyTab from 'containers/EmptyTab';

// Material UI
import IconButton from 'material-ui/IconButton';
import getMuiTheme from  'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import {
  blue500, blue700,
  pinkA200,
} from 'material-ui/styles/colors';
import AppBar from 'material-ui/AppBar';
import IconMenu from 'material-ui/IconMenu';
import MenuItem from 'material-ui/MenuItem';
import FlatButton from 'material-ui/FlatButton';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';

// Panoptes utils
import DetectResize from 'utils/DetectResize';

import 'font-awesome.css';
import 'ui-components.scss';
import 'main.scss';

const muiTheme = getMuiTheme({
  fontFamily: 'Roboto, sans-serif',
  tableHeaderColumn: {
    height: 56,
    spacing: 12,
  },
  tableRowColumn: {
    height: 48,
    spacing: 12,
  },
  tableHeaderColumn: {
    textColor: 'black'
  },
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
        _assign(store.getLastNotification(), {position: 'tc'})));
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
    let config = this.config;
    // NB: initialConfig is actually defined (in index.html)
    return (
      <DetectResize onResize={this.handleResize}>
        <MuiThemeProvider muiTheme={muiTheme}>
          <div>
            <div className="loading-container">
              <div className="spinner" />
            </div>
            <div className="page">
              <Header dataset={config.dataset} name={config.settings.nameBanner} logo={initialConfig.logo}/>
              <div className="body scroll-within">
                  <SessionComponent compId={tabs.get('selectedTab')} />
              </div>
            </div>
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
    let {dataset, name, logo} = this.props;
    let actions = this.getFlux().actions;
    // const userId = this.config.user.id;
    // // TODO: <IconButton tooltip="Help" iconClassName="fa fa-question-circle"/>
    // return (
    //   <div className="header">
    //     <div className="title"><a href={`/panoptes/${dataset}`}><HTMLWithComponents>{name}</HTMLWithComponents></a></div>
    //     <div className="username">
    //       { this.config.cas.service ? (userId == 'anonymous' ?
    //         <a href={`${this.config.cas.service}?service=${window.location.href}`}>Login</a>
    //         : <span>
    //            {userId}
    //            <a className="logout" href={this.config.cas.logout}>logout</a>
    //          </span>) : null
    //       }
    //     </div>
    //     <img className="logo" src={logo}/>
    //     {this.config.user.isManager ?
    //       <IconButton tooltip="Set current state as initial view for all users"
    //                   iconClassName="fa fa-floppy-o"
    //                   onClick={this.handleSaveInitialSession}
    //       /> : null}
    //
    //     <IconButton tooltip="Find"
    //                 iconClassName="fa fa-search"
    //                 onClick={() => actions.session.modalOpen(<Finder />)}
    //     />
    //     <IconButton
    //       tooltip="Link"
    //       iconClassName="fa fa-link"
    //       onClick={this.handlePageLinkClick}
    //     />
    //   </div>
    return (
      <AppBar
        title={<span><img className="top-bar-logo" src={logo}/><HTMLWithComponents className="top-bar-title">{name}</HTMLWithComponents></span>}
        showMenuIconButton={false}
        onTitleTouchTap={() => actions.session.tabSwitch('FirstTab')}
        iconElementRight={this.config.user.isManager ?
          <IconMenu
          iconButtonElement={
            <IconButton><MoreVertIcon /></IconButton>
          }
          targetOrigin={{horizontal: 'right', vertical: 'top'}}
          anchorOrigin={{horizontal: 'right', vertical: 'top'}}
        >
          <MenuItem primaryText="Admin" onClick={() => actions.session.tabOpen(<DatasetManagerActions />)}/>
          <MenuItem primaryText="Table/View list" onClick={() => actions.session.tabOpen(<EmptyTab />)}/>
          <MenuItem primaryText="Sign out" onClick={() => window.location.href = this.config.cas.logout}/>
        </IconMenu> :
          this.config.cas.service ?
            <FlatButton label={<a style={{textDecoration:"inherit", color:'white'}} href={`${this.config.cas.service}?service=${window.location.href}`}>Login</a>} /> : null}
      />
    );
    // TODO: <IconButton tooltip="Help" iconClassName="fa fa-question-circle"/>
    // return (
    //   <div className="header">
    //     <div className="title"><a href={`/panoptes/${dataset}`}>{name}</a></div>
    //     <div className="username">{userID}</div>
    //     <img className="logo" src={logo}/>
    //     {this.config.user.isManager ?
    //       <IconButton tooltip="Set current state as initial view for all users"
    //                   iconClassName="fa fa-floppy-o"
    //                   onClick={this.handleSaveInitialSession}
    //       /> : null}
    //
    //     <IconButton tooltip="Find"
    //                 iconClassName="fa fa-search"
    //                 onClick={() => actions.session.modalOpen(<Finder />)}
    //     />
    //     <IconButton
    //       tooltip="Link"
    //       iconClassName="fa fa-link"
    //       onClick={this.handlePageLinkClick}
    //     />
    //   </div>
    // );
  }
});

export default Panoptes;
