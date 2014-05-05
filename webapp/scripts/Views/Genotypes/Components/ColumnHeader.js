define(["tween", "DQX/Utils"],
    function (tween, DQX) {
        return function ColumnHeader(model, view, height, clickSNPCallback) {
            var that = {};
            that.model = model;
            that.view = view;
            that.height = height;
            that.clickSNPCallback = clickSNPCallback;
            that.last_clip = {l: 0, t: 0, r: 0, b: 0};

            that.draw = function (ctx, clip) {
                var model = that.model;
                var view = that.view;
                that.last_clip = clip;
                var scale = view.col_scale;
                var snp_width = scale(model.col_width) - scale(0);
                //var snps = data.snp_cache.snps;
                var pos = model.col_positions;
                var ord = model.col_ordinal;

                var alpha = tween.manual(snp_width, 5, 20);
                //Little hat and area fill
                ctx.strokeStyle = DQX.getRGB(0, 0, 0, 1);//0.5 * alpha);
                ctx.lineWidth = 1;
                for (var i = 0, end = pos.length; i < end; ++i) {
                   var p = pos[i];
                    var colour = '#000000';
                    if (alpha > 0) {
                        ctx.save();
                        ctx.translate(scale(p) - 0.5 * snp_width, 20);
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.bezierCurveTo(0, -10, 0.5 * snp_width, -10, 0.5 * snp_width, -20);
                        ctx.bezierCurveTo(0.5 * snp_width, -10, snp_width, -10, snp_width, 0);
                        ctx.closePath();
                        ctx.fillStyle = colour;
                        ctx.lineWidth = 1;
                        ctx.fill();
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(snp_width, 0);
                        ctx.lineTo(snp_width, that.height - 20);
                        ctx.lineTo(0, that.height - 20);
                        ctx.closePath();
                        ctx.stroke();
                        ctx.restore();
                    } else {
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(scale(p), 0);
                        ctx.bezierCurveTo(scale(p), that.height,scale(p), that.height,scale(p), that.height);
                        ctx.closePath();
                        ctx.stroke();
                        ctx.restore();
                    }
                }


            };

            that.event = function (type, ev, offset) {
                var pos = ev.center;
                pos = {x: pos.x - offset.x, y: pos.y - offset.y};
                var clip = that.last_clip;
                if (type == 'click') {
                    if (pos.x < clip.l || pos.x > clip.r || pos.y < 0 || pos.y > that.height)
                        return false;
                    var snp = Math.floor(view.snp_scale.invert(pos.x));
                    that.clickSNPCallback(snp);
                }
                if (type == "dragStart") {
                    //Check that the event is occuring within our area
                    if (pos.x < 0 || pos.x > clip.r || pos.y < 0 || pos.y > that.height)
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
                    if (pos.x < clip.l || pos.x > clip.r || pos.y < 0 || pos.y > that.height)
                        return false;
                    var delta = DQX.getMouseWheelDelta(ev);
                    if (delta != 0)
                        that.view.rescaleSNPic(that.view.snp_scale.scale_clamp(that.view.snp_scale.zoom(delta, pos.x), 0, that.data.snp_cache.snp_positions.length));
                    return true;
                }
                return false
            };
            return that;
        };
    }
);