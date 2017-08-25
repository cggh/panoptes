import PropTypes from 'prop-types';
import React from 'react';

const Pluralise = ({text, ord}) => <span>{text}{ord != 1 ? 's' : null}</span>;

Pluralise.propTypes = {
  text: PropTypes.string.isRequired,
  ord: PropTypes.number.isRequired
};
Pluralise.displayName = 'Pluralise';

export default Pluralise;
