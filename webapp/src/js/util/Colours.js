
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
    .interpolate(d3.cie.interpolateLch);
}

export function booleanColours() {
  return (val) => {
    if (val === '1' || val === true || val === 1 || val.toLower() === 't' || val.toLower() === 'true')
      return '#388E3C';
    else
      return '#D32F2F';
  };
}

export function propertyColour(propConfig) {
  if (propConfig.categoryColors)
    return (colour) => propConfig.categoryColors[colour] || propConfig.categoryColors['_other_'] || '#D3D3D3';
  if (propConfig.isBoolean)
    return booleanColours;
  if (propConfig.isText || propConfig.isCategorical)
    return categoryColours(`${propConfig.tableid}_${propConfig.propid}`);
  return scaleColour([propConfig.minVal, propConfig.maxVal]);
}





