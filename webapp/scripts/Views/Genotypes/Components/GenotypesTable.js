define(["_", "tween", "DQX/Utils"],
  function (_, tween, DQX) {
    return function Genotypes() {
      var that = {};
      that.last_clip = {l: 0, t: 0, r: 0, b: 0};


      that.draw = function (ctx, clip, model, view) {
        that.last_clip = clip;
        var x_scale = view.col_scale;
        var snp_width = x_scale(model.col_width) - x_scale(0);
        var y_off = 0;//view.scroll_pos;
        var row_height = Math.ceil(view.row_height);
        var pos = model.col_positions;
        var base_width = snp_width;
        if (snp_width > 40) {
          base_width -= 22;
        }
        var col_len = DQX.niceColours.length;
        var firsts_rows = model.data[model.settings.FirstAllele];
        var second_rows = model.data[model.settings.SecondAllele];
        var alpha_rows = (view.alpha_channel == '__null') ? false : model.data[view.alpha_channel];
        var height_rows = (view.height_channel == '__null') ? false : model.data[view.height_channel];
        var alpha_offset = (view.alpha_channel == '__null') ? 0 : model.table.properties[view.alpha_channel].settings.MinVal;
        var alpha_scale = (view.alpha_channel == '__null') ? 1 : model.table.properties[view.alpha_channel].settings.MaxVal - alpha_offset;
        var height_offset = (view.height_channel == '__null') ? 0 : model.table.properties[view.height_channel].settings.MinVal;
        var height_scale = (view.height_channel == '__null') ? 1 : model.table.properties[view.height_channel].settings.MaxVal - height_offset;

        if (model.data_type == 'diploid') {
          model.row_index.forEach(function (r) {
            var y = (r * row_height) + y_off;
            //Don't draw off screen genotypes
            if ((y + (row_height * 10) < clip.t) || (y - (row_height * 10) > clip.b))
              return;
            var firsts = firsts_rows[r];
            var seconds = second_rows[r];
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
          });
        }

        return model.row_index.length * row_height;
      };

      that.event = function (type, ev, offset) {
        var pos = ev.center;
        pos = {x: pos.x - offset.x, y: pos.y - offset.y};
        var clip = that.last_clip;
        if (type == "dragStart") {
          //Check that the event is occuring within our area
          if (pos.x < 0 || pos.x > clip.r || pos.y < 0 || pos.y > clip.b)
            return false;
          that.drag = true;
          that.startDragScrollPos = that.view.scroll_pos;
          that.startDragScrollY = ev.center.y;
          that.view.snp_scale.startDrag(ev.touches);
          return true;
        }
        if (type == "dragMove") {
          if (that.drag) {
            that.view.rescaleSNPic(that.view.snp_scale.dragMove(ev.touches));
            // Y Scroll
            var dist = that.startDragScrollY - ev.center.y;
            that.view.scroll_pos = that.startDragScrollPos - dist;
            if (that.view.scroll_pos > 0)
              that.view.scroll_pos = 0;
//            if (that.view.scroll_pos < that.max_scroll())
            //             that.view.scroll_pos = that.max_scroll();
          }
          //Return false so that other elements get a drag move even if they moved onto us mid-drag
          return false;
        }
        if (type == "dragEnd") {
          that.drag = false;
          //Return false so that other elements get a drag end even if they moved onto us mid-drag
          return false;
        }
        if (type == "mouseWheel") {
          //Check that the event is occurring within our area
          if (pos.x < 0 || pos.x > clip.r || pos.y < 0 || pos.y > clip.b)
            return false;
          var delta = DQX.getMouseWheelDelta(ev);
          if (delta != 0)
            that.view.rescaleSNPic(that.view.snp_scale.scale_clamp(that.view.snp_scale.zoom(delta, pos.x), 0, that.data.snp_cache.snp_positions.length));
          return true;
        }
      };
      return that;
    };
  }
)
;

