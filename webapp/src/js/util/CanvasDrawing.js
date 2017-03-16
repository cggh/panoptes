export function hatchRect(ctx, x1, y1, dx, dy, delta) {
  ctx.rect(x1, y1, dx, dy);
  ctx.save();
  ctx.clip();
  let majorAxis = Math.max(dx, dy);
  ctx.beginPath();
  for (let n = -1 * (majorAxis); n < majorAxis; n += delta) {
    ctx.moveTo(n + x1, y1);
    ctx.lineTo(dy + n + x1, y1 + dy);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawText(ctx, text, x, y) {
  let {width} = ctx.measureText(text);
  let height = ctx.measureText('M').width + 1; //Yeah.... so the canvas API doesn't let you measure height
  let oldFill = ctx.fillStyle;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  let fadeX = x;
  let fadeY = y;
  if (ctx.textAlign == 'right') {
    fadeX = x - width;
  }
  if (ctx.textAlign == 'center') {
    fadeX = x - (width/2);
  }
  if (ctx.textBaseline == 'middle') {
    fadeY = y - (height/2);
  }
  if (ctx.textBaseline == 'top') {
    fadeY = y;
  }
  ctx.fillRect(fadeX, fadeY, width, height);
  ctx.fillStyle = oldFill;
  ctx.fillText(text, x, y);
}
