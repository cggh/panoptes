import React from 'react';
import PropTypes from 'prop-types';
import DocTemplate from 'panoptes/DocTemplate';
import './page-template.scss';

class PageTemplate extends React.Component {
  static displayName = 'PageTemplate';

  static propTypes = {
    children: PropTypes.node,
    bgurl: PropTypes.string,
  };

  render() {
    let {children, bgurl} = this.props;
    return (
      <div className="obs-page-container">
        {/*<div className="obs-page-backdrop" style={{backgroundImage: `url(/panoptes/Docs/observatory/images/${bgurl})`}} />*/}
        <div className="horiz-centering-container vertical stack obs-page-content">
          {children}
          <div>
            <DocTemplate path="templates/footer.html"/>
          </div>
        </div>
      </div>
    );
  }
}

export default PageTemplate;
