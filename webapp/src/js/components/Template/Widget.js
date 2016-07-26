import React from 'react';
import ItemTemplate from 'panoptes/ItemTemplate';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';

import 'template.scss';


let TemplateWidget = React.createClass({

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    title: React.PropTypes.string,
    content: React.PropTypes.string,
    table: React.PropTypes.string.isRequired,
    primKey: React.PropTypes.string.isRequired
  },


  title() {
    return this.props.title;
  },

  render() {
    let {content, table, primKey} = this.props;
    return (
        <ItemTemplate className="template-container" table={table} primKey={primKey}>
          {content}
        </ItemTemplate>
    );
  }
});

module.exports = TemplateWidget;
