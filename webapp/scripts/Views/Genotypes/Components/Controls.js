define(["lodash", "DQX/Utils"],
  function (_, DQX) {
    return function Controls(data, view, size) {
      var that = {};
      that.data = data;
      that.view = view;
      that.size = size;

      that.images = {};
      var images = ["MagGlassIn", "MagGlassOut", "MagGlassAll"];
      images.forEach(function (name) {
        var img = new Image();
        img.src = "Bitmaps/Icons/Canvas/" + name + ".png"
        that.images[name] = img;
      });

      that.buttons = {
        zoom_in: {img: 'MagGlassIn', l: 0, t: 42},
        zoom_out: {img: 'MagGlassOut', l: 30, t: 42},
        zoom_all: {img: 'MagGlassAll', l: 60, t: 42}
      };

      that.draw = function (ctx, clip) {
        var w = that.size.w;
        var h = that.size.h;
        var view = that.view;
        var data = that.data;
        var g = ctx.createRadialGradient(w, h, w, w, h, 0);
        g.addColorStop(0.85, "rgba(255,255,255,0.85)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.textBaseline = 'top';
        ctx.font = "bold " + 14 + "px sans-serif";
        ctx.strokeStyle = DQX.getRGB(255, 255, 255);
        ctx.fillStyle = DQX.getRGB(0, 0, 0);
        var text = (view.end_snp - view.start_snp) + DQX.pluralise('snp', (view.end_snp - view.start_snp));
        ctx.strokeText(text, 5, 25);
        ctx.fillText(text, 5, 25);
        for (var key in that.buttons) {
          var button = that.buttons[key];
          ctx.drawImage(that.images[button.img], button.l, button.t, 30, 30);
        }
      };

      that.event = function(type, ev, offset) {
        var pos = ev.center;
        pos = {x:pos.x - offset.x, y:pos.y - offset.y};
        if (type == 'click') {
          if (pos.y > 42 && pos.y < 42+30) {
            if (pos.x > 0 && pos.x < 30) {
              that.view.rescaleGenomic(that.view.genome_scale.zoom(1));
              return true;
            }
            if (pos.x > 30 && pos.x < 60) {
              that.view.rescaleGenomic(that.view.genome_scale.zoom(-1));
              return true;
            }
            if (pos.x > 60 && pos.x < 90) {
              that.view.snp_scale.tweenTo({left: 0, right: that.data.snp_cache.snp_positions.length});
              that.view.genome_scale.tweenTo({left: 0, right: _.last(that.data.snp_cache.snp_positions)});
              return true;
            }
          }
          return false
        }
      };

      return that;
    }
  }
);
