define([],
  function () {
    return function Container(contents) {
      var that = {};
      that.contents = contents;
      that.contents.forEach(function (element) {
        element.t || (element.t = 0);
        element.l || (element.l = 0);
      });
      that.contents_by_name = DQX.attrMap(that.contents, 'name');

      that.draw = function(ctx, clip) {
        that.contents.forEach(function (element) {
          ctx.save();
          ctx.translate(element.l, element.t);
          element.content.draw(ctx, {
            t:clip.t - element.t,
            l:clip.l - element.l,
            b:clip.b - element.t,
            r:clip.r - element.l
          });
          ctx.restore();
        })

      };

      that.event = function(type, ev, offset) {
        var done = false;
        //Go in reverse to get top elements first
        for (var i = contents.length-1; i >= 0; --i) {
          done = that.contents[i].content.event(
            type,
            ev,
            {x:that.contents[i].l + offset.x, y:that.contents[i].t+offset.y});
          if (done)
            return done;
        }
        return done;
      };

      return that;
    };
  }
);
