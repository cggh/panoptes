import React from 'react';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';


let DatasetImportStatusItem = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    id: React.PropTypes.string.isRequired
  },

  title() {
    return this.props.title;
  },

  icon() {
    return this.props.icon;
  },

  render: function() {
    let {id} = this.props;

console.log(this.config);

    return (
       <div>file: basedir/temp/log_{id}</div>
    );


  }

});

module.exports = DatasetImportStatusItem;
