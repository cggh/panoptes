define(["_", "tween", "DQX/Utils"],
  function (_, tween, DQX) {
    return function Genotypes(model, view) {
      var that = {};
      that.model = model;
      that.view = view;
      that.last_clip = {l:0, t:0, r:0, b:0};


      that.draw = function (ctx, clip) {
        var view = that.view;
        var model = that.model;
        that.last_clip = clip;
        var x_scale = view.col_scale;
        var snp_width = x_scale(model.col_width) - x_scale(0);
        var y_off = 0;//view.scroll_pos;
        var row_height = Math.ceil(view.row_height);
//        var genotypes = data.snp_cache.genotypes;
//        var col_table = data.snp_cache.colour_table;
//        if (!genotypes) return that;
//        //Genotype squares
//          if (snp_width > 3) {
//            data.samples.forEach(function (sample, s) {
//              var col = genotypes[s].col;
//              var ref = genotypes[s].ref;
//              var alt = genotypes[s].alt;
//              for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
//                  ctx.fillStyle = col_table[col[i]];
//                  ctx.fillRect(x_scale(i)-(snp_width*0.01), sample.vert + y_off, Math.ceil(snp_width), row_height);
//                  //var height = Math.min(row_height,row_height*((ref[i]+alt[i])/100));
//                  //ctx.fillRect(x_scale(i), sample.vert + y_off + (row_height-height)/2, snp_width, height);
//              }
//            });
//          }
//          else {
//            var width = x_scale(view.cache_end_snp) - x_scale(view.cache_start_snp);
//            var x_offset =  x_scale(view.cache_start_snp);
//            if (width > 0)
//              data.samples.forEach(function (sample, i) {
//                ctx.drawImage(sample.genotypes_canvas,x_offset,sample.vert + y_off, width, row_height);
//              });
//          }
          var pos = model.col_positions;
          var base_width = snp_width
          if (snp_width > 40) {
              base_width -= 22;
          }
          var col_len = DQX.niceColours.length;
          if (model.data_type == 'diploid') {
              model.row_index.forEach(function (r) {
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
                      var y = (r * row_height) + y_off;
                      ctx.fillRect(spos, y, Math.ceil(base_width), row_height);
                      if (snp_width > 40) {
                          ctx.fillStyle = DQX.niceColours[first[i] % col_len];
                          ctx.beginPath();
                          ctx.arc(spos+snp_width-16, y+(row_height/2), 5, 0, 2 * Math.PI, false);
                          ctx.fill();
                          ctx.fillStyle = DQX.niceColours[second[i] % col_len];
                          ctx.beginPath();
                          ctx.arc(spos+snp_width-6, y+(row_height/2), 5, 0, 2 * Math.PI, false);
                          ctx.fill();
                      }
                  }
              });
          }

//
//
//        //Read count texts
//        var alpha = tween.manual(snp_width, 58, 68, tween.Easing.Linear.None, 0, 0.8);
//        if (alpha > 0 && row_height > 6) {
//          ctx.font = "" + row_height - 2 + "px sans-serif";
//          ctx.lineWidth = 2;
//          ctx.strokeStyle = DQX.getRGB(0, 0, 0, alpha);
//          ctx.fillStyle = DQX.getRGB(255, 255, 255, alpha);
//          ctx.textBaseline = 'middle';
//          ctx.textAlign = 'right';
//          ctx.strokeStyle = DQX.getRGB(0, 0, 128, alpha);
//          ctx.fillStyle = DQX.getRGB(255, 255, 255, alpha);
//          model.samples.forEach(function (sample, s) {
//            var ref = genotypes[s].ref;
//            for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
//              if (ref[i]) {
//                  var x = x_scale(i) + (snp_width / 2) - 5;
//                  var y = sample.vert + y_off + (row_height / 2);
//                  ctx.strokeText(ref[i], x, y);
//                ctx.fillText(ref[i], x, y);
//              }
//            }
//          });
//          ctx.strokeStyle = DQX.getRGB(128, 0, 0, alpha);
//          ctx.fillStyle = DQX.getRGB(255, 255, 255, alpha);
//          model.samples.forEach(function (sample, s) {
//            var alt = genotypes[s].alt;
//            for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
//              if (alt[i]) {
//                var x = x_scale(i) + (snp_width / 2) + 25;
//                var y = sample.vert + y_off + (row_height / 2);
//                ctx.strokeText(alt[i], x, y);
//                ctx.fillText(alt[i], x, y);
//              }
//            }
//          });
//        }

        //Return our height
        //return _(model.samples).max('vert').value().vert + row_height;
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
          that.view.rescaleSNPic(that.view.snp_scale.scale_clamp(that.view.snp_scale.zoom(delta, pos.x), 0, that.data.snp_cache.snp_positions.length));
          return true;
        }
      };
      return that;
    };
  }
)
;

