define(["tween", "DQX/Utils"],
  function (tween, DQX) {
    return function LDMap(data,view) {
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
        var ld_sq_width = snp_width / Math.sqrt(2);
        var start_snp = Math.floor(x_scale.domain()[0]);
        var end_snp = Math.ceil(x_scale.domain()[1]);
        var genotypes = data.snp_cache.genotypes;
        if (!genotypes) return;
        if (snp_width < 2) return;
        var num_samples = data.samples.length;
        var PAB, PA, PB, A;
        console.time('LD');
        ctx.translate(x_scale(start_snp), 0);
        ctx.rotate(-Math.PI / 4);
        //ctx.scale(1,0.25);
        //TODO Transpose for cache speed
        for (var i = start_snp, end = end_snp; i < end; ++i) {
          for (var j = i+1; j < end; ++j) {
            PAB = 0; PA = 0; PB = 0;
            var dp = 0;
            for (var s = 0; s < num_samples; ++s) {
              dp += (genotypes[s].gt[i] ? 1 : -1)*(genotypes[s].gt[j] ? 1 : -1);
              if (genotypes[s].gt[i] == 0)
                ++PA;
                //A = true;
//              } else
              //  A = false;
              if (genotypes[s].gt[j] == 0)
                ++PB;
//                if (A)
//                  ++PAB;
              //}
            }
            dp /= num_samples;
            dp *= dp;
            //PAB /= num_samples; PA /= num_samples; PB /= num_samples;
            PA /= num_samples; PB /= num_samples;
//            if (PA != 1 && PA != 0 && PB != 1 && PB != 0) {
//              var DAB = PAB - (PA * PB);
//              var r2 = (DAB * DAB) / (PA*(1-PA)*PB*(1-PB));
//              ctx.fillStyle = DQX.getRGB(255, 255 - (r2 * 255), 255 - (r2 * 255));
//              ctx.fillRect(0, ld_sq_width * (j - start_snp), ld_sq_width, ld_sq_width);
////              ctx.strokeText(Math.round(r2*100)/100, ld_sq_width/2, (ld_sq_width * (j - start_snp)) + ld_sq_width/2);
//            } else {
//              ctx.fillStyle = '#F00';//255 - (r2 * 255), 255 - (r2 * 255));
//              ctx.fillRect(0, ld_sq_width * (j - start_snp), ld_sq_width, ld_sq_width);
//            }
            //if (!((PA == 1 || PA == 0) && (PB == 1 || PB == 0))) {
              //dp = 1-dp;
              ctx.fillStyle = DQX.getRGB(255, 225-(dp*255),255-(dp*255));
              ctx.fillRect(0, ld_sq_width * (j - start_snp), ld_sq_width, ld_sq_width);
           // }

        }
          //Move across to the next row
          ctx.translate(ld_sq_width, 0);
        }
        console.timeEnd('LD');


      };
      that.event = function(){};
      return that;
    };
  }
)
;

