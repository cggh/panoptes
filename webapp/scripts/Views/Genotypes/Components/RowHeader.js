define(["tween", "DQX/Utils"],
  function (tween, DQX) {
    return function RowHeader(data, view) {
      var that = {};
      that.view = view;
      that.data = data;

      that.draw = function (ctx, clip) {
        var row_height = Math.ceil(that.view.row_height);
        var g = ctx.createLinearGradient(0, 0, that.view.row_header_width, 0);
        g.addColorStop(0, "rgba(255,255,255,0.85)");
        g.addColorStop(0.85, "rgba(255,255,255,0.85)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(clip.l, clip.t, that.view.row_header_width, clip.b-clip.t );

        ctx.textBaseline = 'middle';
        ctx.fillStyle = DQX.getRGB(0, 0, 0);
        var y_off = view.scroll_pos;

        that.data.samples.forEach(function(sample) {
          ctx.fillStyle = DQX.getRGB(view.colours.get(sample.SampleContext.Site.Name), 0.75);
          ctx.fillRect(sample.depth * 5, sample.vert + y_off, 5, row_height);
        });

        ctx.fillStyle = '#000';
        that.data.sample_and_label_list.forEach(function (label) {
          if (label.is_sample) {
            ctx.font = "" + row_height - 2 + "px sans-serif";
          }
          else
            ctx.font = "12px sans-serif";
          if (row_height > 6 || !label.is_sample)
            ctx.fillText(label.display_name, label.depth * 5, label.vert + y_off + (row_height / 2));
        });
      };

      that.event = function(){};
      return that;
    };
  }
);