import React from 'react';
import scrollbarSize from 'scrollbar-size';
import Sidebar from 'react-sidebar';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// Material UI
import TextField from 'material-ui/TextField';
import FlatButton from 'material-ui/FlatButton';

// Panoptes UI
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';

// Panoptes
import ListView from 'panoptes/ListView';
import ItemTemplate from 'panoptes/ItemTemplate';
import DataItemWidget from 'DataItem/Widget';
import DataDownloader from 'util/DataDownloader';
import HTMLWithComponents from 'panoptes/HTMLWithComponents';
import DataItemViews from 'panoptes/DataItemViews';

// Constants
const MAX_ROWS_COUNT = 10000;

let ListWithActions = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    componentUpdate: React.PropTypes.func.isRequired,
    title: React.PropTypes.string,
    table: React.PropTypes.string.isRequired,
    selectedPrimKey: React.PropTypes.string,
    sidebar: React.PropTypes.bool,
    initialSearchFocus: React.PropTypes.bool
  },

  getDefaultProps() {
    return {
      table: null,
      sidebar: true,
      initialSearchFocus: false
    };
  },

  getInitialState() {
    return {
      search: ''
    };
  },

  componentDidUpdate(prevProps, prevState) {
    if (this.props.initialSearchFocus) {
      this.refs.search.focus();
    }
  },

  icon() {
    return this.tableConfig().icon;
  },

  title() {
    return this.props.title || this.tableConfig().capNamePlural;
  },

  handleSelect(selectedPrimKey) {
    this.props.componentUpdate({selectedPrimKey});
  },

  handleSearchChange(event) {
    this.setState({'search': event.target.value});
  },

  handleTruncatedRowsCountChange(truncatedRowsCount) {
    this.setState({truncatedRowsCount});
  },

  handleDownload() {
    DataDownloader.downloadTableData(
      {
        dataset: this.config.dataset,
        table: this.props.table,
        tableConfig: this.tableConfig(),
        truncatedRowsCount: this.state.truncatedRowsCount,
        onLimitBreach: this.handleDownloadLimitBreach
      }
    );
  },

  handleDownloadLimitBreach(payload) {
    let {totalDataPoints, maxDataPoints} = payload;
    let message = `You have asked to download ${totalDataPoints} data points, which is more than our current limit of ${maxDataPoints}. Please use a stricter filter or fewer columns, or contact us directly.`;
    this.getFlux().actions.session.modalOpen('ui/Alert', {title: 'Warning', message: message});
  },

  render() {
    let {table, sidebar, componentUpdate, selectedPrimKey} = this.props;
    let {description} = this.tableConfig();
    let {search} = this.state;
    let descriptionWithHTML = <HTMLWithComponents>{description}</HTMLWithComponents>;

    let sidebarContent = (
      <div className="sidebar">
        <div className="item-picker">
          <SidebarHeader icon={this.icon()} description={descriptionWithHTML}/>
          <FlatButton label="Download data"
                      primary={true}
                      onClick={() => this.handleDownload()}
                      icon={<Icon fixedWidth={true} name="download" />}
          />
          <div className="search">
            <TextField ref="search"
                       fullWidth={true}
                       floatingLabelText="Search"
                       value={search}
                       onChange={this.handleSearchChange}
            />
          </div>
          <ListView
             search={search}
             table={table}
             selectedPrimKey={selectedPrimKey}
             onSelect={this.handleSelect}
             icon={this.icon()}
             autoSelectIfNoneSelected
             onTruncatedRowsCountChange={this.handleTruncatedRowsCountChange}
             maxRowsCount={MAX_ROWS_COUNT}
            />
        </div>
      </div>
    );

    let views = DataItemViews.getViews(this.tableConfig().dataItemViews, this.tableConfig().hasGeoCoord);

    let dataItem = '';
    if (selectedPrimKey) {
      dataItem = <DataItemWidget views={views} primKey={selectedPrimKey} {...this.props}/>; //We pass along all props as currently selected tab etc are stored here
    }

    return (
      <Sidebar
        styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
        docked={sidebar}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
                  name={sidebar ? 'arrows-h' : 'bars'}
                  onClick={() => componentUpdate({sidebar: !sidebar})}
                  title={sidebar ? 'Expand' : 'Sidebar'}
            />
            {selectedPrimKey ?
              <ItemTemplate className="text" table={table} primKey={selectedPrimKey}>
                {this.tableConfig().itemTitle || `{{${this.tableConfig().primKey}}}`}
              </ItemTemplate> :
            null}
          </div>
          <div>
            {dataItem}
          </div>
        </div>
      </Sidebar>
    );
  }
});

module.exports = ListWithActions;
