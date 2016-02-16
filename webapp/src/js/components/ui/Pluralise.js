import React from 'react';

const Pluralise = ({text, ord}) => <span>{text}{ord != 1 ? 's' : null}</span>;

Pluralise.propTypes = {
  text: React.PropTypes.string.isRequired,
  ord: React.PropTypes.number.isRequired

};

export default Pluralise;
