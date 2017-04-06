import React from 'react';
import ItemTemplate from 'panoptes/ItemTemplate';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';


let Template = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    title: React.PropTypes.string,
    content: React.PropTypes.string,
    table: React.PropTypes.string,
    primKey: React.PropTypes.string
  },


  title() {
    return this.props.title;
  },

  render() {
    let {content, table, primKey} = this.props;
    return (
        <ItemTemplate innerClassName="page-template" table={table} primKey={primKey}>
          {content}
        </ItemTemplate>
    );
  }
});

export default Template;
