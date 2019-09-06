import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import scrollbarSize from 'scrollbar-size';
import Sidebar from 'ui/Sidebar';

// Mixins
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

// Material UI
import TextField from '@material-ui/core/TextField';
import Button from 'ui/Button';

// Panoptes UI
import SidebarHeader from 'ui/SidebarHeader';
import Icon from 'ui/Icon';
import Alert from 'ui/Alert';

// Panoptes
import ListView from 'panoptes/ListView';
import ItemTemplate from 'panoptes/ItemTemplate';
import DataItem from 'DataItem';
import DataDownloader from 'util/DataDownloader';
import HTMLWithComponents from 'panoptes/HTMLWithComponents';
import DataItemViews from 'panoptes/DataItemViews';

let ListWithActions = createReactClass({
  displayName: 'ListWithActions',

  mixins: [
    PureRenderWithRedirectedProps({
      redirect: ['setProps']
    }),
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    setProps: PropTypes.func,
    title: PropTypes.string,
    table: PropTypes.string.isRequired,
    selectedPrimKey: PropTypes.string,
    sidebar: PropTypes.bool,
    initialSearchFocus: PropTypes.bool,
    search: PropTypes.string
  },

  getDefaultProps() {
    return {
      table: null,
      sidebar: true,
      initialSearchFocus: false,
      search: ''
    };
  },

  componentDidMount() {
    if (this.props.initialSearchFocus) {
      this.search.focus();
    }
  },

  icon() {
    return this.tableConfig().icon;
  },

  title() {
    return this.props.title || this.tableConfig().capNamePlural;
  },

  handleSelect(selectedPrimKey) {
    this.redirectedProps.setProps({selectedPrimKey});
  },

  handleSearchChange(event) {
    this.redirectedProps.setProps({search: event.target.value});
  },

  handleRowsCountChange(rowsCount) {
    this.setState({rowsCount});
  },

  handleDownload() {
    DataDownloader(
      {
        dataset: this.config.dataset,
        table: this.props.table,
        tableConfig: this.tableConfig(),
        rowsCount: this.state.rowsCount,
        onLimitBreach: this.handleDownloadLimitBreach
      }
    );
  },

  handleDownloadLimitBreach(payload) {
    let {totalDataPoints, maxDataPoints} = payload;
    let message = `You have asked to download ${totalDataPoints} data points, which is more than our current limit of ${maxDataPoints}. Please use a stricter filter or fewer columns, or contact us directly.`;
    this.getFlux().actions.session.modalOpen(<Alert title="Warning" message={message} />);
  },

  render() {
    let {table, sidebar, selectedPrimKey, search} = this.props;
    let {description} = this.tableConfig();
    let descriptionWithHTML = <HTMLWithComponents>{description}</HTMLWithComponents>;

    let sidebarContent = (
      <div className="sidebar" style={{height: '100%'}}>
        <div className="item-picker vertical stack">
          <SidebarHeader icon={this.icon()} description={descriptionWithHTML}/>
          {/*<Button*/}
          {/*  label="Download data"*/}
          {/*  color="primary"*/}
          {/*  onClick={() => this.handleDownload()}*/}
          {/*  iconName="download"*/}
          {/*/>*/}
          <div className="search">
            <TextField ref={(ref) => this.search = ref}
              fullWidth={true}
              label="Search"
              value={search}
              onChange={this.handleSearchChange}
            />
          </div>
          <div className="item-list-container scroll-within grow">
            <div className="item-list">
              <ListView
                search={search}
                table={table}
                selectedPrimKey={selectedPrimKey}
                onSelect={this.handleSelect}
                autoSelectIfNoneSelected
                onRowsCountChange={this.handleRowsCountChange}
              />
            </div>
          </div>
        </div>
      </div>
    );

    let views = DataItemViews.getViews(this.tableConfig().dataItemViews, this.tableConfig().hasGeoCoord);

    let dataItem = '';
    if (selectedPrimKey) {
      dataItem = <DataItem primKey={selectedPrimKey} {...this.props}>{views}</DataItem>; //We pass along all props as currently selected tab etc are stored here
    }

    return (
      <Sidebar
        styles={{sidebar: {paddingRight: `${scrollbarSize()}px`}}}
        docked={sidebar}
        sidebar={sidebarContent}>
        <div className="vertical stack">
          <div className="top-bar">
            <Icon className="pointer icon"
              name={sidebar ? 'arrow-left' : 'bars'}
              onClick={() => this.redirectedProps.setProps({sidebar: !sidebar})}
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
  },
});

export default ListWithActions;
