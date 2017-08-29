import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import ItemTemplate from 'panoptes/ItemTemplate';

// Mixins
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';
import ConfigMixin from 'mixins/ConfigMixin';


let Template = createReactClass({
  displayName: 'Template',

  mixins: [
    PureRenderMixin,
    FluxMixin,
    ConfigMixin
  ],

  propTypes: {
    title: PropTypes.string,
    content: PropTypes.string,
    table: PropTypes.string,
    primKey: PropTypes.string
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
  },
});

export default Template;
