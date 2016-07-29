import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// Panoptes components
import API from 'panoptes/API';
import ErrorReport from 'panoptes/ErrorReporter';

// UI components
import Loading from 'ui/Loading';
import Icon from 'ui/Icon';

// Material UI
import {List, ListItem} from 'material-ui/List';

// Utils
import RequestContext from 'util/RequestContext';

let DatasetImportStatusListView = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    refreshMilliseconds: React.PropTypes.number,
  },

  getInitialState() {
    return {
      rows: [],
      loadStatus: 'loaded'
    };
  },

  componentWillMount() {
    this._requestContext = new RequestContext();
    this.fetchData(this.props, this._requestContext);
  },

  componentDidMount() {
    this.fetchDataInterval = setInterval(() => this.fetchData(this.props, this._requestContext), this.props.refreshMilliseconds);
  },

  componentWillUnmount() {
    this._requestContext.destroy();
    clearInterval(this.fetchDataInterval);
  },

  // *Not* called by DataFetcherMixin
  fetchData(props, requestContext) {
    this.setState({loadStatus: 'loading'});
    let APIargs = {
      dataset: this.config.dataset
    };
    requestContext.request((componentCancellation) =>
      API.fetchImportStatusData({cancellation: componentCancellation, ...APIargs})
    )
      .then((data) => {
        this.setState({
          loadStatus: 'loaded',
          rows: data
        });
      })
      .catch(API.filterAborted)
      .catch((xhr) => {
        ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
        this.setState({loadStatus: 'error'});
      });
  },

  handleClickImportStatus(logId, title, icon) {
    let switchTo = true;
    this.getFlux().actions.session.popupOpen('Dataset/ImportStatus/ItemView', {logId, title, icon}, switchTo);
  },

  render() {
    let {loadStatus, rows} = this.state;
    return (
      <div>
        <List>
            {rows.map((row) => {
              if (row.name.indexOf(this.config.dataset) === -1) { //Horrible hack until the server knows what dataset this calculation is on
                return null;
              }
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
                //Unfortunately this state is the way the server communicates "busy" for now...
                iconName = 'cog';
                iconSpin = true;
                iconStyle = {color: '#2196f3'};
              }

              // row.scope

              return <ListItem key={row.id}
                        primaryText={<div><span>{row.status}</span></div>}
                        secondaryText={<div><span>{row.name}</span><br/><span>{row.user}</span><span>, </span><span>{row.timestamp}</span></div>}
                        leftIcon={<div><Icon fixedWidth={true} name={iconName} spin={iconSpin} style={iconStyle} /></div>}
                        onClick={(e) => this.handleClickImportStatus(row.id, row.name + ' - ' + row.timestamp, iconName)}
                        secondaryTextLines={2}
              />;
            })}
        </List>
        <Loading status={loadStatus}/>
      </div>
    );
  }

});

module.exports = DatasetImportStatusListView;
