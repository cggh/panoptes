import React from 'react';
import PropTypes from 'prop-types';

class CardStack extends React.Component {
  static displayName = 'CardStack';

  render() {
    let {children, noWrap, thin} = this.props;
    return (
      <div className={"card-stack " + (noWrap ? "" : "card-stack-wrap ") + (thin ? "card-stack-thin " : "")}>
        {children}
    </div>);
  }
}

CardStack.propTypes = {
  noWrap: PropTypes.bool,
  thin: PropTypes.bool
};

export default CardStack;
