
import d3 from 'd3';

let exisitingScales = {};

let colours = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
  '#aec7e8',
  '#ffbb78',
  '#98df8a',
  '#ff9896',
  '#c5b0d5',
  '#c49c94',
  '#f7b6d2',
  '#c7c7c7',
  '#dbdb8d',
  '#9edae5'
];

export function categoryColours(identifier) {
  if (!exisitingScales[identifier])
    exisitingScales[identifier] = d3.scale.ordinal().range(colours);
  return exisitingScales[identifier];
}

export function scaleColour(domain) {
  return d3.scale.linear()
    .domain(domain)  // min/max of data
    .range(['#3d8bd5', '#ff4081'])
    .interpolate(d3.interpolateHcl);
}

export function booleanColours() {
  return (val) => {
    if (val === '1' || val === true || val === 1 || (val.toLower && val.toLower() === 't') || (val.toLower && val.toLower() === 'true'))
      return '#388E3C';
    else
      return '#D32F2F';
  };
}

export function propertyColour(propConfig, min = null, max = null) {
  if (!propConfig)
    return () => 'inherit';
  if (propConfig.categoryColors)
    return (value) => propConfig.categoryColors[value] || propConfig.categoryColors['_other_'] || 'inherit';
  if (propConfig.isBoolean)
    return booleanColours();
  if (propConfig.isCategorical) {
    const colourFunc = categoryColours(`${propConfig.tableid}_${propConfig.propid}`);
    //Run thorugh the possibilites so they are enumerated in sort order, not appearance order.
    if (propConfig.propCategories) {
      propConfig.propCategories.forEach(colourFunc);
    }
    return colourFunc;
  }
  if (propConfig.isText)
    return categoryColours(`${propConfig.tableid}_${propConfig.propid}`);
  return scaleColour([min || propConfig.minVal, max || propConfig.maxVal]);
}





