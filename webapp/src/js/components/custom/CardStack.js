import React from 'react';
import './page-template.scss'

class CardStack extends React.Component {
  static displayName = 'CardStack';

  render() {
    let {children} = this.props;
    return (
      <div className="card-stack">
        {children}
    </div>);
  }
}

export default CardStack;
