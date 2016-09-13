import _isFinite from 'lodash/isFinite';
import classnames from 'classnames';
import React from 'react';
import PureRenderMixin from 'mixins/PureRenderMixin';


let NumericInput = React.createClass({
  mixins: [
    PureRenderMixin,
  ],

  propTypes: {
    value: React.PropTypes.func.number,
    onChange: React.PropTypes.func.isRequired
  },


  componentWillMount() {
    this.setFromProps(this.props);
  },

  componentWillReceiveProps(nextProps) {
    this.setFromProps(nextProps);
  },

  setFromProps(props) {
    let {value} = props;
    try {
      this.setState({
        text: value.toString(),
        valid: true
      });
    } catch (e) {
      this.setState({
        text: value,
        valid: false
      });
    }
  },

  handleChange() {
    let text = this.refs.input.value;
    this.setState({text});
    let number = parseInt(text);
    if (_isFinite(number)) {
      this.setState({valid: true});
      this.props.onChange(number);
      return;
    }
    this.setState({valid: false});
  },

  render() {
    let {text, valid} = this.state;
    return (
          <input className={classnames({wide: true, invalid: !valid})}
                 ref="input"
                 type="number"
                 spellCheck="false"
                 value={text}
                 onChange={this.handleChange}/>
    );
  }
});

module.exports = NumericInput;

