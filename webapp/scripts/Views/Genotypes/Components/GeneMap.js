define(["lodash", "tween", "DQX/Utils"],
  function (_, tween, DQX) {
    return function GeneMap(data, view) {
      var that = {};
      that.data = data;
      that.view = view;
      that.colours = [0x800000, 0xFF0000, 0xFFFF00, 0x808000, 0x00FF00,	0x008000,	0x00FFFF,
      0x008080,	0x0000FF,	0x000080,	0xFF00FF, 0x800080];
      that.last_clip = {l:0, t:0, r:0, b:0};

      that.formatSI = function (number) {
        var prefix = d3.formatPrefix(parseFloat(number));
        return prefix.scale(number) + prefix.symbol;
      };

      that.draw = function (ctx, clip) {
        var view = that.view;
        var data = that.data;
        that.last_clip = clip;
        var scale = view.genome_scale;
        var snp_scale = view.snp_scale;
        var snps = data.snps;
        var positions = data.snp_cache.snp_positions;
        var snp, i, end;
        var snps_length = view.end_snp - view.start_snp;
        var snp_width = snp_scale(1) - snp_scale(0);

        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(clip.l, clip.t, clip.r-clip.l, 100);

        //Scale ticks
        var ticks = scale.ticks((scale.range()[1]-scale.range()[0]) / 100);
        ctx.beginPath();
        ticks.forEach(function (tick) {
          ctx.moveTo(scale(tick), 12);
          ctx.lineTo(scale(tick), 25);
        });
        ctx.strokeStyle = '#000';
        ctx.stroke();
        //Scale numbers
        ctx.fillStyle = "#000";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ticks.forEach(function (tick) {
          ctx.fillText(that.formatSI(tick), scale(tick), 2);
        });
        //Annotation rectangles
        ctx.fillStyle = "rgba(0,153,0,0.50)";
        ctx.strokeStyle = "rgba(0,153,0,0.05)";
        data.annotations.forEach(function (annot) {
          var width = scale(annot.width) - scale(0);
          if (width > 2) {
            ctx.beginPath();
            DQX.roundedRect(ctx, scale(annot.start), 25, width, 15, Math.min(6, width/2));
            ctx.fill();
          }
          else {
            ctx.beginPath();
            ctx.moveTo(scale(annot.start), 25);
            ctx.lineTo(scale(annot.start), 40);
            ctx.stroke();
          }
        });
        //Loading indicator
        ctx.save();
        ctx.strokeStyle = "rgba(255,0,0,0.50)";
        ctx.beginPath();
        data.snp_cache.intervals_being_fetched(view.chrom).forEach(function(interval) {
          ctx.moveTo(scale(interval.start), 25);
          ctx.lineTo(scale(interval.start), 35);
          ctx.moveTo(scale(interval.start), 30);
          ctx.lineTo(scale(interval.end), 30);
          ctx.moveTo(scale(interval.end), 25);
          ctx.lineTo(scale(interval.end), 35);
        });
        ctx.stroke();
        ctx.restore();
        //Curves from gene scale to SNP scale
        var alpha = tween.manual(snp_width, 2, 5);
        if (alpha > 0) {
          for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
            var snp_pos = positions[i];
            ctx.strokeStyle = '#000'//TODODQX.getRGB(snp.rgb.r, snp.rgb.g, snp.rgb.b, alpha);
            ctx.lineWidth = snp && snp.selected ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(scale(snp_pos), 50);
            ctx.bezierCurveTo(scale(snp_pos), 75, snp_scale(i + 0.5), 75, snp_scale(i + 0.5), 100);
            ctx.stroke();
          }
          //SNP Triangles and line on genome
          ctx.strokeStyle = "rgba(0,0,0,0.50)";
          ctx.fillStyle = "rgba(0,152,0,0.50)";
          for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
            var snp = snps[i];
            var snp_pos = positions[i];
            ctx.beginPath();
            ctx.moveTo(scale(snp_pos), 25);
            ctx.lineTo(scale(snp_pos), 40);
            ctx.lineWidth = snp && snp.selected ? 2 : 1;
            ctx.stroke();
            DQX.polyStar(ctx, scale(snp_pos), 47, 7, 3, 0, -90);
            ctx.fill();
            ctx.stroke();
          }
        }

        //If we aren't doing lines then do grouped linking
        var fixed_width;
        alpha = tween.manual(snp_width, 5, 2);
        if (alpha > 0) {
          var regions = [];
          //Decide if we want to group or just use fixed width hilight
          if (snps_length > 5000) {
            //Use fixed width
            fixed_width = true;
            var jump = 1000;
            for (i = Math.floor(view.start_snp/jump)*jump; i+jump < positions.length; i += jump) {
              regions.push([i, i+jump]);
            }
            regions.push([i, Math.min(i+jump, positions.length-1)]);
          } else {
            //Find some groupings based on large jumps - regions are pairs of snp indexes
            fixed_width = false;
            var gaps = [];
            for (i = view.start_snp+1, end = view.end_snp; i < end; ++i) {
              gaps.push([i-1, positions[i] - positions[i-1]])
            }
            gaps.sort(function(a,b) {return b[1]-a[1]});
            gaps = gaps.slice(0, Math.min(Math.ceil(gaps.length/20),20));
            gaps.sort(function(a,b) {return a[0]-b[0]});
            if (gaps.length > 0) {
              regions.push([view.start_snp, gaps[0][0]]);
              for (i = 0; i < gaps.length-1; i += 1) {
                regions.push([gaps[i][0]+1, gaps[i+1][0]]);
              }
              regions.push([gaps[gaps.length-1][0]+1, view.end_snp-1]);
            }
          }
          ctx.save();
          ctx.strokeStyle = DQX.getRGB(0,0,0,alpha);
          ctx.lineWidth = 2;
          for (i = 0; i < regions.length; i += 1) {
            var i1 = regions[i][0];
            var i2 = regions[i][1];
            var pos = positions[i1];
            var pos2 = positions[i2];
            //ctx.fillStyle = i % 2 ? DQX.getRGB(0,0,255,alpha/2) : DQX.getRGB(0,128,255,alpha/2);
            ctx.fillStyle = DQX.getRGB(that.colours[(fixed_width ? i1/jump : i1) % that.colours.length], alpha/2);
            ctx.beginPath();
            ctx.moveTo(scale(pos), 50);
            ctx.bezierCurveTo(scale(pos), 75, snp_scale(i1+0.5), 75, snp_scale(i1+0.5), 100);
            ctx.lineTo(snp_scale(i2+1), 100);
            ctx.bezierCurveTo(snp_scale(i2+1.5), 75, scale(pos2), 75,  scale(pos2), 50);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }

        ctx.font = "bold 12px sans-serif";
        ctx.lineWidth = 2;
        ctx.strokeStyle = DQX.getRGB(0, 0, 0, 1);
        ctx.fillStyle = DQX.getRGB(255, 255, 255, 1);
        ctx.textAlign = 'left';
        data.annotations.forEach(function (annot) {
          var width = scale(annot.width) - scale(0);
          if (width > 5 && annot.name != "-") {
            ctx.strokeText(annot.name, scale(annot.start), 25, scale(annot.width) - scale(0));
            ctx.fillText(annot.name, scale(annot.start), 25, scale(annot.width) - scale(0));
          }
        });
      };

      that.event = function(type, ev, offset) {
        var pos = ev.center;
        pos = {x:pos.x - offset.x, y:pos.y - offset.y};
        var clip = that.last_clip;
        if (type == "dragStart") {
          //Check that the event is occuring within our area
          if (pos.x < clip.l || pos.x > clip.r || pos.y < clip.t || pos.y > 75)
            return false;
          that.drag = true;
          that.view.genome_scale.startDrag(ev.touches);
          return true;
        }
        if (type == "dragMove") {
          if (that.drag)
            that.view.rescaleGenomic(that.view.genome_scale.dragMove(ev.touches));
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
          if (pos.x < clip.l || pos.x > clip.r || pos.y < clip.t || pos.y > 75)
            return false;
          var delta = DQX.getMouseWheelDelta(ev);
          that.view.rescaleGenomic(that.view.genome_scale.scale_clamp(that.view.genome_scale.zoom(delta, pos.x), 0, _.last(data.snp_cache.snp_positions)));
          return true;
        }
      };

      return that;
    };
  }
);



