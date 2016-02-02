import React from 'react';
import ReactDOM from 'react-dom';
import PureRenderMixin from 'mixins/PureRenderMixin';



let Channel = React.createClass({
  mixins: [
    PureRenderMixin
  ],

  propTypes: {
    height: React.PropTypes.number.isRequired,
    width: React.PropTypes.number.isRequired,
    sideWidth: React.PropTypes.number.isRequired,
    sideComponents: React.PropTypes.element,
  },

  render() {
    let {height, width, sideWidth, sideComponents} = this.props;
    let effWidth = width - sideWidth;

    return (
      <div className="channel-container">
        <div className="channel" style={{height: height}}>

          <div className="channel-side" style={{width: `${sideWidth}px`}}>
            {sideComponents}
          </div>

          <div className="channel-data" style={{width: `${effWidth}px`}}>
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }
});

module.exports = Channel;
