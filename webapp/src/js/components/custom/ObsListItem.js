import React from 'react';
import createReactClass from 'create-react-class';
import FluxMixin from 'mixins/FluxMixin';
import DocPage from 'panoptes/DocPage';
import {ListItem} from 'material-ui/List';

let ObsListItem = createReactClass({
  displayName: 'ObsListItem',

  mixins: [
    FluxMixin
  ],

  render() {
    let {children, table, primKey, href, ...other} = this.props;
    return (
      <ListItem button onClick={(e) => {
        e.stopPropagation(); //To prevent a popup containing this button bringing itself to the front
        // if (link) {
        //   this.getFlux().actions.session.tabOpen(link);
        // } else
        if (table && primKey) {
          this.getFlux().actions.panoptes.dataItemPopup({table, primKey: primKey});
        } else if (href) {
          this.getFlux().actions.session.tabOpen(<DocPage path={href}/>);
        }
      }} {...other}>
        {children}
      </ListItem>
    );
  }
});

export default ObsListItem;
