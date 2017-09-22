import React from 'react';
import createReactClass from 'create-react-class';
import filterChildren from 'util/filterChildren';
import FluxMixin from 'mixins/FluxMixin';
import {ListItem} from 'material-ui/List';
import DocPage from 'panoptes/DocPage';

let ObsListItem = createReactClass({
  displayName: 'ObsListItem',

  mixins: [
    FluxMixin
  ],

  render() {
    let {children, table, primKey, href, ...other} = this.props;
    children = filterChildren(this, children);
    let [icon, title, link] = children;
    return (
      <ListItem primaryText={title} leftIcon={icon} onClick={(e) => {
        e.stopPropagation(); //To prevent a popup containing this button bringing itself to the front
        if (link) {
          this.getFlux().actions.session.tabOpen(link);
        }
        else if (table && primKey) {
          this.getFlux().actions.panoptes.dataItemPopup({table, primKey: primKey});
        } else if (href) {
          this.getFlux().actions.session.tabOpen(<DocPage path={href}/>);
        }
      }} {...other}/>
    );
  }
});

export default ObsListItem;
