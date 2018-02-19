import React from 'react';
import './page-template.scss'
import KeyboardArrowRight from 'material-ui-icons/KeyboardArrowRight';
import filterChildren from 'util/filterChildren';
import DocLink from 'panoptes/DocLink';

class BreadCrumb extends React.Component {
  static displayName = 'BreadCrumb';

  render() {
    let {children, a, b} = this.props;
    children = filterChildren(this, children);
    children = children || [];
    if (children.length === undefined) children = [children];

    b === 'regions' ? children.unshift(<DocLink href="regions.html">Regions</DocLink>) :  null;
    b === 'drugs' ? children.unshift(<DocLink href="drugs.html">Drugs</DocLink>) :  null;
    b === 'genes' ? children.unshift(<DocLink href="genes.html">Genes</DocLink>) :  null;
    b === 'about' ? children.unshift(<DocLink href="about.html">About</DocLink>) :  null;
    b === 'technical' ? children.unshift(<DocLink href="technical.html">Publications and Reports</DocLink>) :  null;

    a === 'pf' ? children.unshift(<DocLink href="pf.html">Plasmodium falciparum</DocLink>) :  null;
    a === 'pv' ? children.unshift(<DocLink href="pv.html">Plasmodium vivax</DocLink>) :  null;
    a === 'ag' ? children.unshift(<DocLink href="ag.html">Anopheles gambiae</DocLink>) :  null;

    // children.unshift(<span>Guidebook</span>);

    return (
      <div className="obs-breadcrumb">
        <div className="obs-breadcrumb-inner">
          {React.Children.map(children, (child, i) =>
            [<div className="obs-breadcrumb-component">{child}</div>, i < children.length - 1 ? <KeyboardArrowRight style={{height: '16px', marginTop: '3px'}}/> : null]
          )}
        </div>
      </div>
    );
  }
}

export default BreadCrumb;
