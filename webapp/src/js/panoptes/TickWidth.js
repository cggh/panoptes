module.exports = (width, pixelWidth, tickPixelWidth) =>
  Math.pow(5, Math.floor(Math.log(2*(width / (pixelWidth/tickPixelWidth)))/1.6094379124341003)); // 5^(floor(log5(2*x))) Gives nearest power of 5
