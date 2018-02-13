import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import FluxMixin from 'mixins/FluxMixin';
import DocPage from 'panoptes/DocPage';
import {ListItem} from 'material-ui/List';
import ConfigMixin from 'mixins/ConfigMixin';

let ObsListItem = createReactClass({
  displayName: 'ObsListItem',

  mixins: [
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    table: PropTypes.string,
    primKey: PropTypes.string,
    href: PropTypes.string,
    download: PropTypes.bool
  },


  render() {
    let {children, table, primKey, href, download, ...other} = this.props;
    if (!download) {
      if (href && href.indexOf('://') === -1) {
        //Internal link
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
      } else {
        //External link
        return (<a style={{textDecoration:'none'}} href={href}>
          <ListItem button {...other}>
            {children}
          </ListItem>
        </a>);
      }
    } else {
      return (
        <a style={{textDecoration:'none'}} href={`${process.env.DATASET_URL_PATH_PREFIX}Docs/${this.config.dataset}/${href}`}>
          <ListItem button {...other}>
            {children}
          </ListItem>
        </a>
      );

    }
  }
});

export default ObsListItem;
