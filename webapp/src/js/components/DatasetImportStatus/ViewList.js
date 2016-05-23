import React from 'react';
import Immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import classNames from 'classnames';
import Color from 'color';
import _throttle from 'lodash/throttle';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';

// Panoptes components
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import ErrorReport from 'panoptes/ErrorReporter';

// UI components
import Loading from 'ui/Loading';
import Icon from 'ui/Icon';

// Material UI
import {List, ListItem} from 'material-ui/List';

let DatasetImportStatusViewList = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin,
    DataFetcherMixin('foo')
  ],

  getInitialState() {
    return {
      rows: [],
      loadStatus: 'loaded'
    };
  },

  //Called by DataFetcherMixin
  fetchData(props, requestContext) {
    this.setState({loadStatus: 'loading'});
    let APIargs = {
      dataset: this.config.dataset
    };
    requestContext.request((componentCancellation) =>
        LRUCache.get(
          'fetchImportStatusData' + JSON.stringify(APIargs),
          (cacheCancellation) =>
            API.fetchImportStatusData({cancellation: cacheCancellation, ...APIargs}),
          componentCancellation
        )
      )
      .then((data) => {
        this.setState({
          loadStatus: 'loaded',
          rows: data
        });
      })
      .catch(API.filterAborted)
      .catch(LRUCache.filterCancelled)
      .catch((xhr) => {
        ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
        this.setState({loadStatus: 'error'});
      });
  },

  handleClickImportStatus(id, title, icon) {
    let switchTo = true;
    this.getFlux().actions.session.popupOpen('DatasetImportStatus/ViewItem', {id, title, icon}, switchTo);
  },

  render() {
    let {loadStatus, rows} = this.state;

    return (
      <div>
        <List>
            {rows.map((row) => {

              let iconName = null;
              let iconSpin = false;
              let iconStyle = {};
              if (row.failed) {
                iconName = 'warning';
                iconStyle = {color: 'orange'};
              } else if (row.completed) {
                iconName = 'check';
                iconStyle = {color: 'green'};
              } else if (row.progress) {
                iconName = 'cog';
                iconSpin = true;
                iconStyle = {color: '#2196f3'};
              } else {
                console.error('unhandled icon status');
              }

              // row.scope

              return <ListItem key={row.id}
                        primaryText={<div><span>{row.status}</span></div>}
                        secondaryText={<div><span>{row.name}</span><br/><span>{row.user}</span><span>, </span><span>{row.timestamp}</span></div>}
                        leftIcon={<div><Icon fixedWidth={true} name={iconName} spin={iconSpin} style={iconStyle} /></div>}
                        onClick={(e) => this.handleClickImportStatus(row.id, row.name, iconName)}
                        secondaryTextLines={2}
              />;
            })}
        </List>
        <Loading status={loadStatus}/>
      </div>
    );
  }

});

module.exports = DatasetImportStatusViewList;
