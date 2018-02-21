import PropTypes from 'prop-types';
import React from  'react';
import createReactClass from 'create-react-class';
import {withStyles} from 'material-ui/styles';

// Mixins
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderMixin from 'mixins/PureRenderMixin';

// Panoptes
import EmptyTab from 'containers/EmptyTab';
import DatasetManagerActions from 'components/DatasetManagerActions';
import Icon from 'ui/Icon';
import DocPage from 'panoptes/DocPage';

// Material UI
import AppBar from 'material-ui/AppBar';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import IconButton from 'material-ui/IconButton';
import MenuIcon from 'material-ui-icons/Menu';
import {ListItemIcon, ListItemText} from 'material-ui/List';
import HomeIcon from 'material-ui-icons/Home';
import SettingsIcon from 'material-ui-icons/Settings';
import ListIcon from 'material-ui-icons/List';
import ExitToAppIcon from 'material-ui-icons/ExitToApp';
import Divider from 'material-ui/Divider';
import Drawer from 'material-ui/Drawer';
import List, {ListItem} from 'material-ui/List';

import 'font-awesome.css';
import 'ui-components.scss';
import 'main.scss';

const drawerWidth = 280;
const iconColour = '#69B3E4';

const styles = (theme) => ({
  list: {
    width: drawerWidth,
  },
  nested: {
    paddingLeft: theme.spacing.unit * 5,
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
    name: PropTypes.string,
    logo: PropTypes.string,
    classes: PropTypes.object.isRequired,
    tabs: PropTypes.object.isRequired,
    components: PropTypes.object.isRequired,
  },

  getInitialState() {
    return {
      drawerIsOpen: false,
    };
  },

  handleClickHamburger(event) {
    this.setState({drawerIsOpen: true});
  },

  handleCloseDrawer() {
    this.setState({drawerIsOpen: false});
  },

  // NOTE: Copied from Panoptes.js
  isDocPage(component) {
    return component.type === 'DocPage' ||  component.type ===  'DataItem';
  },
  // NOTE: Mutated from Panoptes.js
  handleChangeTab(index) {
    let actions = this.getFlux().actions.session;
    // let {tabs,  components} = this.state;
    // tabs = tabs.toJS();
    // components = components.toJS();
    let {tabs,  components} = this.props;
    //Filter all the DocPage components to a list
    let docPages = [];
    let others = [];
    tabs.components.forEach((component) => {
      if (component !== 'FirstTab') {
        (this.isDocPage(components[component]) ? docPages : others).push(component);
      }
    });
    if (index === 0) {
      actions.tabSwitch('FirstTab');
    }
    if (index === 1) {
      actions.tabSwitch(docPages[docPages.length - 1]);
    }
    if (index === 2) {
      actions.tabSwitch(others[others.length - 1]);
    }
  },

  render() {
    let {logo, classes} = this.props;
    let actions = this.getFlux().actions;
    const {drawerIsOpen} = this.state;
    return (
      <AppBar position="static">
        <Toolbar disableGutters={true} style={{marginLeft: '12px', marginRight: '12px'}}>
          <IconButton
            style={{color: '#36454F'}}
            aria-label="open drawer"
            onClick={this.handleClickHamburger}
          >
            <MenuIcon />
          </IconButton>
          <Drawer
            variant="temporary"
            classes={{
              paper: classes.drawerPaper,
            }}
            open={drawerIsOpen}
            onBackdropClick={this.handleCloseDrawer}
          >
            <div className={classes.list}>
              <div style={{textAlign: 'center', marginTop: '10px', marginBottom: '10px', cursor: 'pointer'}}>
                <img src={logo} onClick={this.handleCloseDrawer}/>
              </div>
              <List component="nav">
                <ListItem button onClick={() => (this.handleCloseDrawer(), actions.session.tabSwitch('FirstTab'))}>
                  <ListItemIcon>
                    <HomeIcon style={{color: iconColour}}/>
                  </ListItemIcon>
                  <ListItemText primary="Home" />
                </ListItem>
                <ListItem button onClick={() => (this.handleCloseDrawer(), this.handleChangeTab(1))}>
                  <ListItemIcon>
                    <Icon className="icon" baseURL="/panoptes/Docs/observatory/images/icons/" name="image:guidebook.svg" />
                  </ListItemIcon>
                  <ListItemText primary="Guidebook" />
                </ListItem>
                <ListItem button onClick={() => (this.handleCloseDrawer(), actions.session.tabOpen(<DocPage path="pf.html"/>))}>
                  <ListItemIcon>
                    <Icon className="icon" baseURL="/panoptes/Docs/observatory/images/icons/" name="image:plasmodium-falciparum.svg" />
                  </ListItemIcon>
                  <ListItemText primary="P. falciparum" />
                </ListItem>
                <List component="div" disablePadding>
                  <ListItem button className={classes.nested} onClick={() => (this.handleCloseDrawer(), actions.session.tabOpen(<DocPage path="regions.html"/>))}>
                    <ListItemIcon>
                      <Icon className="icon" baseURL="/panoptes/Docs/observatory/images/icons/" name="image:map.svg" />
                    </ListItemIcon>
                    <ListItemText inset primary="Regions" />
                  </ListItem>
                  <ListItem button className={classes.nested} onClick={() => (this.handleCloseDrawer(), actions.session.tabOpen(<DocPage path="drugs.html"/>))}>
                    <ListItemIcon>
                      <Icon className="icon" baseURL="/panoptes/Docs/observatory/images/icons/" name="image:drug01.svg" />
                    </ListItemIcon>
                    <ListItemText inset primary="Drugs" />
                  </ListItem>
                  <ListItem button className={classes.nested} onClick={() => (this.handleCloseDrawer(), actions.session.tabOpen(<DocPage path="genes.html"/>))}>
                    <ListItemIcon>
                      <Icon className="icon" baseURL="/panoptes/Docs/observatory/images/icons/" name="image:gene01.svg" />
                    </ListItemIcon>
                    <ListItemText inset primary="Genes" />
                  </ListItem>
                  <ListItem button className={classes.nested} onClick={() => (this.handleCloseDrawer(), actions.session.tabOpen(<DocPage path="about.html"/>))}>
                    <ListItemIcon>
                      <Icon className="icon" baseURL="/panoptes/Docs/observatory/images/icons/" name="image:table01.svg" />
                    </ListItemIcon>
                    <ListItemText inset primary="Data" />
                  </ListItem>
                </List>
                {this.config.user.isManager ?
                  [
                    <Divider key="Divider1" />,
                    <ListItem button key="ListItem1" onClick={() => (this.handleCloseDrawer(), actions.session.tabOpen(<DatasetManagerActions />))}>
                      <ListItemIcon>
                        <SettingsIcon style={{color: iconColour}}/>
                      </ListItemIcon>
                      <ListItemText primary="Admin" />
                    </ListItem>,
                    <ListItem button key="ListItem2" onClick={() => (this.handleCloseDrawer(), actions.session.tabOpen(<EmptyTab />))}>
                      <ListItemIcon>
                        <ListIcon style={{color: iconColour}}/>
                      </ListItemIcon>
                      <ListItemText primary="Table/View list" />
                    </ListItem>,
                    <ListItem button key="ListItem3" onClick={() => (this.handleCloseDrawer(), window.location.href = this.config.cas.logout)}>
                      <ListItemIcon>
                        <ExitToAppIcon style={{color: iconColour, transform: 'scaleX(-1)'}}/>
                      </ListItemIcon>
                      <ListItemText primary="Sign out" />
                    </ListItem>,
                  ]
                  :
                  (
                    this.config.cas.service ?
                      [
                        <Divider key="Divider1" />,
                        <ListItem button
                          key="ListItem1"
                        >
                          <a style={{textDecoration: 'inherit', color: 'white'}} href={`${this.config.cas.service}?service=${window.location.href}`}>Login</a>
                        </ListItem>
                      ]
                      : null
                  )
                }
              </List>
            </div>
          </Drawer>
          <Typography
            variant="title"
            onClick={() => actions.session.tabSwitch('FirstTab')}
            align="center"
            style={{width: '100%', marginRight: '48px'}}
          >
            {<img className="top-bar-logo" src={logo} style={{margin: '0', padding: '0'}}/>}
          </Typography>
        </Toolbar>
      </AppBar>
    );
  },
});

export default withStyles(styles)(Header);
