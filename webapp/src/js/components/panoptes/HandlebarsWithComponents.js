import PropTypes from 'prop-types';
import React from 'react';
import createReactClass from 'create-react-class';
import HTMLWithComponents from 'panoptes/HTMLWithComponents';
import customHandlebars from 'util/customHandlebars';

// Mixins
import ConfigMixin from 'mixins/ConfigMixin';
import PureRenderMixin from 'mixins/PureRenderMixin';
import FluxMixin from 'mixins/FluxMixin';

let HandlebarsWithComponents = createReactClass({
  displayName: 'HandlebarsWithComponents',

  mixins: [
    ConfigMixin,
    PureRenderMixin,
    FluxMixin,
  ],

  propTypes: {
    children: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  },

  getInitialState() {
    return {
      rendered: ''
    };
  },

  componentDidMount() {
    let {children, ...other} = this.props;
    if (children === undefined || children === null) {
      return;
    }
    this.handlebars = customHandlebars(this.config, ...other);
    children = children instanceof Array ? children.join('') : children;
    const result = this.handlebars.compile(children)({config: this.config, ...other});
    if (result.then) {
      result.then((rendered) =>
        this.setState({
          rendered
        }));
    } else {
      this.setState({
        rendered: result
      });
    }
  },

  render() {
    return <HTMLWithComponents>{this.state.rendered}</HTMLWithComponents>;
  },
});

export default HandlebarsWithComponents;
