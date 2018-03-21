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
import Collapse from 'material-ui/transitions/Collapse';
import ExpandLess from 'material-ui-icons/ExpandLess';
import ExpandMore from 'material-ui-icons/ExpandMore';
import Tabs, {Tab} from 'material-ui/Tabs';

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
    paddingLeft: theme.spacing.unit * 4,
  },
  nested2: {
    paddingLeft: theme.spacing.unit * 6,
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
    version: PropTypes.string,
    tabIndex: PropTypes.number,
    onTabChange: PropTypes.func,
  },

  getInitialState() {
    return {
      drawerIsOpen: false,
      guidebooksIsExpanded: true,
      pfIsExpanded: true,
    };
  },

  handleClickHamburger(event) {
    this.setState({drawerIsOpen: true});
  },

  handleCloseDrawer() {
    this.setState({drawerIsOpen: false});
  },

  handleToggleExpand(stateToToggle) {
    this.setState({[stateToToggle]: !this.state[stateToToggle]});
  },

  render() {
    let {logo, classes, version, tabIndex, onTabChange} = this.props;
    let actions = this.getFlux().actions;
    const {drawerIsOpen, guidebooksIsExpanded, pfIsExpanded} = this.state;
    return (
      <AppBar position="static" style={{backgroundColor: this.config.colours.appBar}}>
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
                <ListItem button onClick={() => (this.handleCloseDrawer(), onTabChange(1))}>
                  <ListItemIcon>
                    <Icon className="icon" name="docimage:icons/guidebook.svg" />
                  </ListItemIcon>
                  <ListItemText primary="Guidebooks" />
                  {guidebooksIsExpanded ? <ExpandLess onClick={(event) => (event.stopPropagation(), this.handleToggleExpand('guidebooksIsExpanded'))}/> : <ExpandMore onClick={(event) => (event.stopPropagation(), this.handleToggleExpand('guidebooksIsExpanded'))}/>}
                </ListItem>
                <Collapse in={guidebooksIsExpanded} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    <ListItem button className={classes.nested} onClick={() => (this.handleCloseDrawer(), actions.session.tabOpen(<DocPage path="news.html"/>))}>
                      <ListItemIcon>
                        <Icon className="icon"  name="docimage:icons/stories-news.svg" />
                      </ListItemIcon>
                      <ListItemText primary="Articles" />
                    </ListItem>
                  </List>
                  <List component="div" disablePadding>
                    <ListItem button className={classes.nested} onClick={() => (this.handleCloseDrawer(), actions.session.tabOpen(<DocPage path="pf.html"/>))}>
                      <ListItemIcon>
                        <Icon className="icon"  name="docimage:icons/plasmodium-falciparum.svg" />
                      </ListItemIcon>
                      <ListItemText primary="P. falciparum" />
                      {pfIsExpanded ? <ExpandLess onClick={(event) => (event.stopPropagation(), this.handleToggleExpand('pfIsExpanded'))}/> : <ExpandMore onClick={(event) => (event.stopPropagation(), this.handleToggleExpand('pfIsExpanded'))}/>}
                    </ListItem>
                  </List>
                  <Collapse in={pfIsExpanded} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      <ListItem button className={classes.nested2} onClick={() => (this.handleCloseDrawer(), actions.session.tabOpen(<DocPage path="regions.html"/>))}>
                        <ListItemIcon>
                          <Icon className="icon"  name="docimage:icons/map.svg" />
                        </ListItemIcon>
                        <ListItemText inset primary="Regions" />
                      </ListItem>
                      <ListItem button className={classes.nested2} onClick={() => (this.handleCloseDrawer(), actions.session.tabOpen(<DocPage path="drugs.html"/>))}>
                        <ListItemIcon>
                          <Icon className="icon"  name="docimage:icons/drug01.svg" />
                        </ListItemIcon>
                        <ListItemText inset primary="Drugs" />
                      </ListItem>
                      <ListItem button className={classes.nested2} onClick={() => (this.handleCloseDrawer(), actions.session.tabOpen(<DocPage path="genes.html"/>))}>
                        <ListItemIcon>
                          <Icon className="icon"  name="docimage:icons/gene01.svg" />
                        </ListItemIcon>
                        <ListItemText inset primary="Genes" />
                      </ListItem>
                    </List>
                  </Collapse>
                </Collapse>
                <ListItem button onClick={() => (this.handleCloseDrawer(), actions.session.tabOpen(<DocPage path="about.html"/>))}>
                  <ListItemIcon>
                    <Icon className="icon" name="docimage:icons/table01.svg" />
                  </ListItemIcon>
                  <ListItemText inset primary="Data" />
                </ListItem>
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
          <div
            style={{flex: '1', marginLeft: '21px', height: '64px', textAlign: 'center'}}
          >
            <img onClick={() => actions.session.tabSwitch('FirstTab')} src={logo} style={{cursor: 'pointer', maxWidth: '100%', height: 'calc(100% - 12px)', marginTop: '12px', marginBottom: '12px'}}/>
          </div>
          <div style={{fontSize: '11px', color: '#36454F', textAlign: 'center', marginRight: '12px', marginLeft: '12px'}}>data&#160;version<br/>{version}&#160;beta</div>
        </Toolbar>
        <Tabs
          onChange={onTabChange}
          value={tabIndex}
          indicatorColor="primary"
          textColor="primary"
          centered
          style={{marginRight: '21px'}}
        >
          <Tab label="Home" />
          <Tab label="Guidebook" />
          <Tab label="Viewer" />
        </Tabs>
      </AppBar>
    );
  },
});

export default withStyles(styles)(Header);
