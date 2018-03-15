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
    download: PropTypes.bool,
    target: PropTypes.string,
    children: PropTypes.node,
    disableGutters: PropTypes.bool,
  },

  getDefaultProps() {
    return {
      disableGutters: false,
    };
  },

  render() {
    let {children, table, primKey, href, download, target, disableGutters, ...other} = this.props;
    if (!download) {
      if (!href || (href && href.indexOf('://') === -1)) {
        //Internal link
        return (
          <ListItem button disableGutters={disableGutters} onClick={(e) => {
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
        return (<a style={{textDecoration: 'none'}} href={href}>
          <ListItem button disableGutters={disableGutters} {...other}>
            {children}
          </ListItem>
        </a>);
      }
    } else {
      // This path prefix isn't determined by process.env.DATASET_URL_PATH_PREFIX
      return (
        <a style={{textDecoration: 'none'}} href={`/panoptes/Docs/${this.config.dataset}/${href}`} target={target}>
          <ListItem button disableGutters={disableGutters} {...other}>
            {children}
          </ListItem>
        </a>
      );

    }
  }
});

export default ObsListItem;
