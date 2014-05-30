define(["_", "tween", "DQX/Utils"],
  function (_, tween, DQX) {
    return function Genotypes() {
      var that = {};
      that.last_clip = {l: 0, t: 0, r: 0, b: 0};


      that.draw = function (ctx, clip, model, view) {
        that.last_clip = clip;
        var x_scale = view.col_scale;
        var snp_width = x_scale(model.col_width) - x_scale(0);
        var row_height = Math.ceil(view.row_height);
        var pos = model.col_positions;
        var base_width = snp_width;
        if (snp_width > 40) {
          base_width -= 22;
        }
        var col_len = DQX.niceColours.length;
        var firsts_rows = model.data[model.settings.FirstAllele];
        var seconds_rows = model.data[model.settings.SecondAllele];
        var alpha_rows = (view.alpha_channel == '__null') ? false : model.data[view.alpha_channel];
        var height_rows = (view.height_channel == '__null') ? false : model.data[view.height_channel];
        var alpha_offset = (view.alpha_channel == '__null') ? 0 : model.table.properties[view.alpha_channel].settings.MinVal;
        var alpha_scale = (view.alpha_channel == '__null') ? 1 : model.table.properties[view.alpha_channel].settings.MaxVal - alpha_offset;
        var height_offset = (view.height_channel == '__null') ? 0 : model.table.properties[view.height_channel].settings.MinVal;
        var height_scale = (view.height_channel == '__null') ? 1 : model.table.properties[view.height_channel].settings.MaxVal - height_offset;

        if (firsts_rows==undefined || seconds_rows==undefined || alpha_rows==undefined || height_rows==undefined)
          return model.row_index.length * row_height;


        if (model.data_type == 'diploid') {
          for (var j = 0, ref = model.row_index.length; j < ref; j++) {
            var r = model.row_index[j];
            var y = (r * row_height);
            //Don't draw off screen genotypes
            if ((y + (row_height * 10) < clip.t) || (y - (row_height * 10) > clip.b))
              continue;
            var firsts = firsts_rows[r];
            var seconds = seconds_rows[r];
            var alphas = alpha_rows[r];
            var heights = height_rows[r];
            for (var i = 0, end = pos.length; i < end; ++i) {
              var alpha = alphas ? ((alphas[i]-alpha_offset) / alpha_scale)*0.8 + 0.2 : 1;
              alpha = Math.min(Math.max(alpha, 0), 1);
              var height = heights ? ((heights[i]-height_offset) / height_scale)*0.8 + 0.2 : 1;
              height = Math.min(Math.max(height, 0), 1);
              var first = firsts[i];
              var second = seconds[i];
              if (height > 1)
                height = 1;
              if (height < 0)
                height = 0;
              if (first == second) {
                if (first == 0)
                  ctx.fillStyle = 'rgba(0,55,135,' + alpha + ')';
                else
                  ctx.fillStyle = 'rgba(180,0,0,' + alpha + ')';
              }
              else
                ctx.fillStyle = 'rgba(78,154,0,' + alpha + ')';
              if (first == -1 || second == -1)
                ctx.fillStyle = 'rgb(80,80,80)';
              var spos = x_scale(pos[i]) - (snp_width * 0.5);
              ctx.fillRect(spos, y + ((1 - height) * row_height * 0.5), Math.ceil(base_width), height * row_height);
              if (snp_width > 40) {
                ctx.fillStyle = first == -1 ? '#000000' : DQX.niceColours[first % col_len];
                ctx.beginPath();
                ctx.arc(spos + snp_width - 16, y + (row_height / 2), (row_height / 2), 0, 2 * Math.PI, false);
                ctx.fill();
                ctx.fillStyle = second == -1 ? '#000000' : DQX.niceColours[second % col_len];
                ctx.beginPath();
                ctx.arc(spos + snp_width - 6, y + (row_height / 2), (row_height / 2), 0, 2 * Math.PI, false);
                ctx.fill();
              }
            }
          }
        }

        return model.row_index.length * row_height;
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
                  if (columnic_pos > (p-model.col_width/2) && columnic_pos < (p+model.col_width/2)) {
                      var picked_col_ord = model.col_primary_key[i];
                      break;
                  }
              }
              if (picked_col_ord) {
                  var row_height = Math.ceil(view.row_height);
                  var row_num =  Math.floor(pos.y/row_height);
                  return {type:'click_cell', col_key:picked_col_ord, row_key:model.row_primary_key[row_num]};
              }
          }
          return false;
      };
      return that;
    };
  }
)
;

