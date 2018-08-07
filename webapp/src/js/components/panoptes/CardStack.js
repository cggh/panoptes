import React from 'react';

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
