define(["_", "tween", "DQX/Utils"],
  function (_, tween, DQX) {
    return function Genotypes() {
      var that = {};
      that.last_clip = {l:0, t:0, r:0, b:0};


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
          if (model.data_type == 'diploid') {
              model.row_index.forEach(function (r) {
                  var y = (r * row_height) + y_off;
                  //Don't draw off screen genotypes
                  if ((y+(row_height*10) < clip.t) || (y-(row_height*10) > clip.b))
                    return
                  var depth = model.depth[r];
                  var first = model.first_allele[r];
                  var second = model.second_allele[r];
                  for (var i = 0, end = pos.length; i < end; ++i) {
                      if (first[i] == second[i]) {
                          if (first[i] == 0)
                            ctx.fillStyle = 'rgba(0,0,255,' + (depth[i] / 100) + ')';
                          else
                            ctx.fillStyle = 'rgba(0,255,0,' + (depth[i] / 100) + ')';
                      }
                      else
                          ctx.fillStyle = 'rgba(255,0,0,' + (depth[i] / 100) + ')';
                      if (first[i] == -1 || second[i] == -1)
                          ctx.fillStyle = 'rgb(0,0,0)';
                      var spos = x_scale(pos[i]) - (snp_width * 0.5);
                      ctx.fillRect(spos, y, Math.ceil(base_width), row_height);
                      if (snp_width > 40) {
                          ctx.fillStyle = first[i] == -1 ? '#000000' : DQX.niceColours[first[i] % col_len];
                          ctx.beginPath();
                          ctx.arc(spos+snp_width-16, y+(row_height/2), 5, 0, 2 * Math.PI, false);
                          ctx.fill();
                          ctx.fillStyle = second[i] == -1 ? '#000000' : DQX.niceColours[second[i] % col_len];
                          ctx.beginPath();
                          ctx.arc(spos+snp_width-6, y+(row_height/2), 5, 0, 2 * Math.PI, false);
                          ctx.fill();
                      }
                  }
              });
          }

        return model.row_index.length * row_height;
      };

      that.event = function(type, ev, offset) {
        var pos = ev.center;
        pos = {x:pos.x - offset.x, y:pos.y - offset.y};
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

