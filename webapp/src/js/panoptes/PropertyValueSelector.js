import React from 'react';
import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderWithRedirectedProps from 'mixins/PureRenderWithRedirectedProps';
import FluxMixin from 'mixins/FluxMixin';
import DataFetcherMixin from 'mixins/DataFetcherMixin';
import Divider from 'material-ui/Divider';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import API from 'panoptes/API';
import LRUCache from 'util/LRUCache';
import ErrorReport from 'panoptes/ErrorReporter';
import SQL from 'panoptes/SQL';
import Loading from 'ui/Loading';
import DetectResize from 'utils/DetectResize';
import _each from 'lodash/each';
import _filter from 'lodash/filter';


const PropertyValueSelector = React.createClass({
  mixins: [
    PureRenderWithRedirectedProps({
      redirect: [
        'onSelect'
      ],
      check: [
        'table',
        'value'
      ]
    }),
    FluxMixin,
    ConfigMixin,
	DataFetcherMixin('table', 'query', 'columnProperty', 'rowProperty')
  ],

  propTypes: {
    table: React.PropTypes.string,
    value: React.PropTypes.string,
    filter: React.PropTypes.func,
    onSelect: React.PropTypes.func,
    label: React.PropTypes.string,
    propid: React.PropTypes.string,
    allowNull: React.PropTypes.bool
  },

  getDefaultProps() {
    return {
      filter: () => true
    };
  },
  
    getInitialState() {
    return {
      data: [],
      loadStatus: 'loading'
    };
  },
  
  fetchData(props, requestContext) {

	let query = SQL.WhereClause.encode(SQL.WhereClause.Trivial()) ;
	let table = props.table ;
	let columnProperty = props.propid ;
	let columnspec = {} ;
	columnspec[columnProperty] = this.config.tablesById[table].propertiesById[columnProperty].defaultDisplayEncoding;

	let pageQueryAPIargs = {
	  database: this.config.dataset,
	  table: table,
	  columns:columnspec,
	  query: query,
	  distinct:true,
	  transpose: false
	};

    this.setState({loadStatus: 'loading', data: []});

	requestContext.request((componentCancellation) =>
		LRUCache.get(
		  'pageQuery' + JSON.stringify(pageQueryAPIargs),
		  (cacheCancellation) =>
			API.pageQuery({cancellation: cacheCancellation, ...pageQueryAPIargs}),
		  componentCancellation
		)
	)
	.then((data) => {
	  let countries = data[columnProperty];
        this.setState({
	        data: countries,
	        loadStatus:'loaded'
        });
        if ( typeof props.value != 'undefined' ) this.redirectedProps.onSelect(props.value);
    } )
    .catch(API.filterAborted)
    .catch(LRUCache.filterCancelled)
    .catch((xhr) => {
      ErrorReport(this.getFlux(), API.errorMessage(xhr), () => this.fetchData(this.props));
      this.setState({loadStatus: 'error'});
    })
    . done()

  } ,



  render() {
    const {table, value, label, propid, filter, allowNull} = this.props;

    let {loadStatus, data} = this.state;

    let propertyMenu = [] ; //allowNull ? [<MenuItem value='NULL' primaryText="None"/>] : [];
    
    _each ( data , (entry) => {
    	propertyMenu.push(<MenuItem value={entry} key={entry} primaryText={entry}/>);
    } ) ;

    return (
    <SelectField value={value === 'NULL' ? undefined : value}
                 autoWidth={true}
                 floatingLabelText={label}
                 onChange={(e, i, v) => this.redirectedProps.onSelect(v)}>
      {propertyMenu}
    </SelectField>
    );
  }
});

export default PropertyValueSelector;
