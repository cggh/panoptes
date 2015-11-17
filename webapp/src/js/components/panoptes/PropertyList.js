const React = require('react');
const Immutable = require('immutable');
const ImmutablePropTypes = require('react-immutable-proptypes');

// Mixins
const PureRenderMixin = require('mixins/PureRenderMixin');
const FluxMixin = require('mixins/FluxMixin');
const ConfigMixin = require('mixins/ConfigMixin');
const StoreWatchMixin = require('mixins/StoreWatchMixin');

// Panoptes components
const PropertyListItem = require('panoptes/PropertyListItem');

let PropertyList = React.createClass({

  mixins: [
             PureRenderMixin,
             FluxMixin,
             ConfigMixin
  ],

  propTypes: {
        data: React.PropTypes.object.isRequired,
        tableConfig: React.PropTypes.object.isRequired
  },

  render: function() {
    
    let {data, tableConfig} = this.props;
    
    return (
      <table>
        <tbody>
          {
            Object.keys(data).map(
              function(key, i){
                let columnData = tableConfig.propertiesMap[key];
                return <PropertyListItem key={i} value={data[key]} columnData={columnData} tooltipPlacement={"right"} tooltipTrigger={['hover']} />
              }
            )
          }
        </tbody>
      </table>
    );
    
    
  }

});

module.exports = PropertyList;
