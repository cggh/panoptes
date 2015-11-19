const Color = require('color');
const MAX_COLOR = Color("#44aafb");

module.exports = function(maxVal, minVal, categoryColors, showBar, value, rowIndex) {
  
  let backgroundColor = "rgba(0,0,0,0)";
  
  if (showBar && value !== null && maxVal !== undefined && minVal !== undefined) {
    value = parseFloat(value);
    let percent = 100*(value - minVal)/(maxVal-minVal);
    backgroundColor = `linear-gradient(to right, ${rowIndex % 2 ? "rgb(115, 190, 252)" : "rgb(150, 207, 253)"} ${percent}%, rgba(0,0,0,0) ${percent}%`
  } else if (value !== null && maxVal !== undefined && minVal !== undefined) {
    let clippedCellData = Math.min(Math.max(parseFloat(value),minVal),maxVal);
    backgroundColor = MAX_COLOR.clone().lighten(0.58*(1-(clippedCellData - minVal)/(maxVal-minVal))).rgbString();
  }
  if (categoryColors) {
    let categoryColor = categoryColors[value] || categoryColors['_other_'];
    
    console.log("BackgroundColor categoryColor: " + categoryColor);
    
    if (categoryColors) {
      let col = categoryColors[value] || categoryColors['_other_'];
      if (col) {
        col = Color(col).lighten(0.3);
        if (rowIndex % 2)
          col.darken(0.1);

        backgroundColor = col.rgbString();
      }
    }
  }
  
  return backgroundColor;
};
