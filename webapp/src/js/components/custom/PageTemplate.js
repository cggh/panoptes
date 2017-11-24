import React from 'react';
import './page-template.scss'

class PageTemplate extends React.Component {
  static displayName = 'PageTemplate';

  render() {
    let {children, bgurl} = this.props;
    return (
      <div className="obs-page-container">
        {/*<div className="obs-page-backdrop" style={{backgroundImage: `url(/panoptes/Docs/observatory/images/${bgurl})`}} />*/}
        <div className="horiz-centering-container vertical stack obs-page-content">
              {children}
        </div>
      </div>
    );
  }
}

export default PageTemplate;
