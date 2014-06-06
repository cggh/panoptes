// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["tween", "DQX/Utils"],
  function (tween, DQX) {
    return function ColumnHeader(height, clickSNPCallback) {
      var that = {};
      that.height = height;
      that.clickSNPCallback = clickSNPCallback;
      that.last_clip = {l: 0, t: 0, r: 0, b: 0};

      that.draw = function (ctx, clip, model, view) {
        that.last_clip = clip;
        var scale = view.col_scale;
        var snp_width = scale(model.col_width) - scale(0);
        //var snps = data.snp_cache.snps;
        var pos = model.col_positions;
        var ord = model.col_ordinal;

        var alpha = tween.manual(snp_width, 5, 20);
        //Little hat and area fill
        ctx.strokeStyle = DQX.getRGB(120, 120, 120, 1);//0.5 * alpha);
        ctx.lineWidth = 1;
        for (var i = 0, end = pos.length; i < end; ++i) {
          var p = pos[i];
          var colour = '#686868';
          if (alpha > 0) {
            ctx.save();
            ctx.translate(scale(p) - 0.5 * snp_width, 20);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(0, -10, 0.5 * snp_width, -10, 0.5 * snp_width, -20);
            ctx.bezierCurveTo(0.5 * snp_width, -10, snp_width, -10, snp_width, 0);
            ctx.closePath();
            ctx.fillStyle = colour;
            ctx.lineWidth = 1;
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(snp_width, 0);
            ctx.lineTo(snp_width, that.height - 20);
            ctx.lineTo(0, that.height - 20);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
          } else {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(scale(p), 0);
            ctx.bezierCurveTo(scale(p), that.height, scale(p), that.height, scale(p), that.height);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
          }
        }


      };

      that.event = function (type, pos, offset, model, view) {
        pos = {x: pos.x - offset.x, y: pos.y - offset.y};
        var clip = that.last_clip;
        if (type == 'click') {
          if (pos.x < clip.l || pos.x > clip.r || pos.y < 0 || pos.y > that.height)
            return false;
          var columnic_pos = view.col_scale.invert(pos.x);
          for (var i = 0, end = model.col_positions.length; i < end; ++i) {
            var p = model.col_positions[i];
            if (columnic_pos > (p-model.col_width/2) && columnic_pos < (p+model.col_width/2))
              return {type: 'click_col', col_key: model.col_primary_key[i]};
          }

        }
        return false;
      };
      return that;
    };
  }
);
