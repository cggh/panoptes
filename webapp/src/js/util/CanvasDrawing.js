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
