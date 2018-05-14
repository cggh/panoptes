import {scaleOrdinal, scaleLinear} from 'd3-scale';
import {interpolateHcl} from 'd3-interpolate';
import Color from 'color';
import _isNan from 'lodash.isnan';
import _sortedIndex from 'lodash.sortedindex';
import _sortedLastIndex from 'lodash.sortedlastindex';

let exisitingScales = {};

export const colours = [
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

export const scaleColours = [
  '#2ca02c',
  '#d62728'
];

// "a list of the X11 colors [X11COLORS] supported by popular browsers with the addition of gray/grey variants from SVG 1.0."
// "The resulting list is precisely the same as the SVG 1.0 color keyword names"
// https://www.w3.org/TR/css3-color/#svg-color

export const x11Colours = [
  'aliceblue',
  'antiquewhite',
  'aqua',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'black',
  'blanchedalmond',
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'cyan',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgreen',
  'darkgrey',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'fuchsia',
  'gainsboro',
  'ghostwhite',
  'gold',
  'goldenrod',
  'gray',
  'green',
  'greenyellow',
  'grey',
  'honeydew',
  'hotpink',
  'indianred',
  'indigo',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgreen',
  'lightgrey',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'lime',
  'limegreen',
  'linen',
  'magenta',
  'maroon',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'navy',
  'oldlace',
  'olive',
  'olivedrab',
  'orange',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'pink',
  'plum',
  'powderblue',
  'purple',
  'red',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'silver',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'teal',
  'thistle',
  'tomato',
  'turquoise',
  'violet',
  'wheat',
  'white',
  'whitesmoke',
  'yellow',
  'yellowgreen'
];

export function categoryColours(identifier) {
  if (!exisitingScales[identifier]) {
    // scaleFunction needs to be defined outside the assigned anonymous function,
    // otherwise a new scale will be assigned for each value.
    let scaleFunction = scaleOrdinal().range(colours);
    exisitingScales[identifier] = (value) => isValidColour(value) ? value : scaleFunction(value);
  }
  return exisitingScales[identifier];
}

export function scaleColour(domain, range = scaleColours) {
  return scaleLinear()
    .domain(domain)  // min/max of data, or extremes for range, e.g. .domain([-1, 0, 1]).range(["red", "white", "green"])
    .range(range)
    .clamp(true)
    .interpolate(interpolateHcl);
}

export function booleanColours() {
  return (val) => {
    if (val === null)
      return '#777777';
    else if (val === '1' || val === true || val === 1 || (val.toLower && val.toLower() === 't') || (val.toLower && val.toLower() === 'true'))
      return '#388E3C';
    else
      return '#D32F2F';
  };
}

export function propertyColour(propConfig) {
  if (!propConfig) {
    return () => 'inherit';
  }
  if (propConfig.valueColours)
    return (value) => propConfig.valueColours[value] || propConfig.valueColours['_other_'] || '#777777';
  if (propConfig.isBoolean)
    return booleanColours();
  if (propConfig.isCategorical) {
    // NOTE: isCategorical is set to true by ImportDataTable.py whenever all the values in the column are unique.
    const colourFunc = categoryColours(`${propConfig.tableId}_${propConfig.id}`);
    //Run thorugh the possibilities so they are enumerated in sort order, not appearance order. If we don't do this colours will be different depending on what plots etc are looked at first. As the colours are allocated as they are requested.
    if (propConfig.distinctValues) {
      propConfig.distinctValues.forEach(colourFunc);
    }
    return colourFunc;
  }
  if (propConfig.isText)
    return categoryColours(`${propConfig.tableId}_${propConfig.id}`);
  let {colours, thresholds, nullColour, interpolate} = propConfig.scaleColours;

  //Special case the simplest to avoid invoking all the sortedIndex machinery without need
  if (thresholds.length === 2) {
    if (interpolate) {
      let scale = scaleColour(thresholds, colours);
      return (value) => value === null || _isNan(value) ? nullColour : scale(value);
    } else {
      return (value) => value === null || _isNan(value) ? nullColour : colours[0];
    }
  } else {
    if (interpolate) {
      let scales = [];
      for(let i = 0, l = colours.length-1; i < l; ++i) {
        scales.push(scaleColour([thresholds[i], thresholds[i+1]], [colours[i], colours[i+1]]));
      }
      return (value) => {
        let index = Math.max(0,Math.min(scales.length - 1, _sortedIndex(thresholds, value) - 1));
        return value === null || _isNan(value) ? nullColour : scales[index](value);
      }
    } else {
      return (value) => {
        let index = Math.max(0,Math.min(colours.length - 1, _sortedLastIndex(thresholds, value) - 1));
        if (value === thresholds[index] && index > 0) index -= 1;
        return value === null || _isNan(value) ? nullColour : colours[index];
      }
    }
  }
}

// Credit: https://gist.github.com/olmokramer/82ccce673f86db7cda5e
export function isValidColour(colour) {
  if (colour === undefined || colour === null || typeof colour !== 'string') {
    return false;
  } else if (x11Colours.indexOf(colour.toLowerCase()) !== -1) {
    return true;
  } else if (colour.charAt(0) === '#') {
    colour = colour.substring(1);
    return [3, 4, 6, 8].indexOf(colour.length) !== -1 && !isNaN(parseInt(colour, 16));
  } else {
    return /^(rgb|hsl)a?\((\d+%?(deg|rad|grad|turn)?[,\s]+){2,3}[\s\/]*[\d\.]+%?\)$/i.test(colour);
  }
}

// Credit: https://24ways.org/2010/calculating-color-contrast
export function isColourDark(colour) {
  if (colour === 'transparent' || colour === 'inherit' || colour === 'initial') {
    console.warn('Cannot determine isColourDark for ', colour);
    return null;
  }
  colour = Color(colour);
  const r = colour.red();
  const g = colour.green();
  const b = colour.blue();
  const a = colour.alpha();
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (a < 0.5 || yiq >= 128) ? false : true;
}
