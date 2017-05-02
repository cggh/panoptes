import PropTypes from 'prop-types';
import React from  'react';
import createReactClass from 'create-react-class';
import NotificationSystem from 'react-notification-system';
import deserialiseComponent from 'util/deserialiseComponent'; // NB: deserialiseComponent is actually used.
import _assign from 'lodash.assign';

// Mixins
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderMixin from 'mixins/PureRenderMixin';
import StoreWatchMixin from 'mixins/StoreWatchMixin';

// Panoptes
import Modal from 'ui/Modal';
import Copy from 'ui/Copy';
import Confirm from 'ui/Confirm';
import SessionComponent from 'panoptes/SessionComponent';
import HTMLWithComponents from 'panoptes/HTMLWithComponents';
import EmptyTab from 'containers/EmptyTab';
import DatasetManagerActions from 'components/DatasetManagerActions';


// Material UI
import createPalette from 'material-ui/styles/createPalette';
import createTypography from 'material-ui/styles/createTypography';
import {createMuiTheme, MuiThemeProvider} from 'material-ui/styles';
import {withTheme} from 'material-ui/styles';
import {blue, pink} from 'material-ui/colors';
import {A200 as pinkA200} from 'material-ui/colors/pink';
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import IconButton from 'material-ui/IconButton';
import MenuIcon from 'material-ui-icons/Menu';
import Menu, { MenuItem } from 'material-ui/Menu';
import MoreVert from 'material-ui-icons/MoreVert';

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
  genotypeRefColor: 'rgb(0, 128, 192)',
  genotypeAltColor: 'rgb(255, 50, 50)',
  genotypeHetColor: 'rgb(0, 192, 120)',
  genotypeNoCallColor: 'rgb(230, 230, 230)'
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
        <MuiThemeProvider theme={muiTheme}>
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

  getInitialState() {
    return {
      anchorEl: null,
      open: false
    }
  },

  handleClick(event) {
    this.setState({ open: true, anchorEl: event.currentTarget });
  },

  handleRequestClose() {
    this.setState({ open: false });
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
    return (
      <AppBar position="static">
        <Toolbar>
          <IconButton color="contrast" aria-label="Menu">
            <MenuIcon />
          </IconButton>
          <Typography type="title" color="inherit">
            {<HTMLWithComponents>{name}</HTMLWithComponents>}
          </Typography>
          {this.config.user.isManager ? [<IconButton
            style={{color: 'white'}}
            aria-label="More"
            aria-owns={this.state.open ? 'long-menu' : null}
            aria-haspopup="true"
            onClick={this.handleClick}
          >
            <MoreVert />
          </IconButton>,
          <Menu
            id="long-menu"
            anchorEl={this.state.anchorEl}
            open={this.state.open}
            onRequestClose={this.handleRequestClose}
          >
            <MenuItem selected={false} onClick={() => (this.handleRequestClose(), actions.session.tabOpen(<DatasetManagerActions />))}>Admin</MenuItem>
            <MenuItem selected={false} onClick={() => (this.handleRequestClose(), actions.session.tabOpen(<EmptyTab />))}>Table/View list</MenuItem>
            <MenuItem selected={false} onClick={() => (this.handleRequestClose(), window.location.href = this.config.cas.logout)}>Sign out</MenuItem>
          </Menu>] : this.config.cas.service ? <Button color="primary">
            <a style={{textDecoration:"inherit", color:'white'}} href={`${this.config.cas.service}?service=${window.location.href}`}>Login</a>
          </Button>: null
          }

        </Toolbar>
      </AppBar>
    );
  },
});

export default withTheme()(Panoptes);
