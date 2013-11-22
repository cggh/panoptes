define(["tween", "DQX/Utils"],
  function (tween, DQX) {
    return function Bifurcation(data, view) {
      var that = {};
      that.data = data;
      that.view = view;
      that.last_clip = {l:0, t:0, r:0, b:0};


      that.draw = function (ctx, clip) {
        var view = that.view;
        var data = that.data;
        that.last_clip = clip;
        var x_scale = view.snp_scale;
        var snp_width = x_scale(1) - x_scale(0);
        var start_snp = Math.floor(x_scale.domain()[0]);
        var end_snp = Math.ceil(x_scale.domain()[1]);
        var middle_snp = Math.floor((end_snp - start_snp)/2)+start_snp;
        var genotypes = data.snp_cache.genotypes;
        if (!genotypes) return;
        if (snp_width < 1) return;
        var num_samples = data.samples.length;
        console.time('Flow');
        //Just do middle to end for now
        //Make a set of strings that are the haplotypes for each sample
        var gap = .02;
        var draw = function (start, end, step) {
          var groups = [{samples: _.range(data.samples.length), top:5, height:Math.max(0,clip.b - 10) }];
          for (var pos = start; pos != end; pos += step) {
            var new_groups = [];
            _(groups).forEach(function(group) {
              var refs = _.filter(group.samples, function(sample) {
                return genotypes[sample].gt[pos] == 0;
              });
              var alts = _.filter(group.samples, function(sample) {
                return genotypes[sample].gt[pos] == 1;
              });
              var ref_top, alt_top, ref_height, alt_height, last_ref_height, last_alt_height, last_alt_top, split = false;
              if (refs.length && alts.length) {
                split = true;
                ref_top = group.top;
                ref_height = (group.height-(gap*group.height)) * (refs.length/(refs.length+alts.length));
                alt_top = ref_top+ref_height+(gap*group.height);
                alt_height = (group.height-(gap*group.height)) * (alts.length/(refs.length+alts.length));

                last_alt_top = ref_top+ref_height + ((gap*group.height)/2);
                last_ref_height = ref_height + ((gap*group.height)/2);

                last_alt_height = (group.height) * (alts.length/(refs.length+alts.length));
              } else if (refs.length) {
                ref_top = group.top;
                ref_height = group.height;
              } else if (alts.length) {
                alt_top = group.top;
                alt_height = group.height;
              }
              var x1 = step > 0 ? x_scale(pos) : x_scale(pos) + Math.ceil(snp_width);
              var x2 = x_scale(pos) + (snp_width/2);
              var x3 = step > 0 ? x_scale(pos) + Math.ceil(snp_width) : x_scale(pos);
              if (refs.length) {
                new_groups.push({samples: refs, top:ref_top, height:ref_height});
                ctx.fillStyle = '#00F';
                ctx.strokeStyle = '#00F';
                if (!split)
                  ctx.fillRect(x_scale(pos), ref_top, Math.ceil(snp_width), ref_height);
                else {
                  ctx.beginPath();
                  ctx.moveTo(x1, group.top);
                  ctx.lineTo(x3, group.top);
                  ctx.lineTo(x3, ref_top+ref_height);
                  ctx.bezierCurveTo(x2, ref_top+ref_height, x2, group.top+last_ref_height, x1, group.top+last_ref_height);
                  ctx.closePath();
                  ctx.fill();
                }
              }
              if (alts.length)
                new_groups.push({samples: alts, top:alt_top, height:alt_height});
                ctx.fillStyle = '#F00';
                ctx.strokeStyle = '#F00';
                if (!split)
                  ctx.fillRect(x_scale(pos), alt_top, Math.ceil(snp_width), alt_height);
                else {
                  ctx.beginPath();
                  ctx.moveTo(x1, last_alt_top);
                  ctx.bezierCurveTo(x2, last_alt_top, x2, alt_top, x3, alt_top);
                  ctx.lineTo(x3, alt_top+alt_height);
                  ctx.lineTo(x1, alt_top+alt_height);
                  ctx.closePath();
                  ctx.fill();
                }

              });
            groups = new_groups;
          }
        };
        draw(middle_snp, end_snp, 1);
        draw(middle_snp, start_snp, -1);

        console.timeEnd('Flow');

      };

      that.event = function(){};
      return that;
    };
  }
)
;

