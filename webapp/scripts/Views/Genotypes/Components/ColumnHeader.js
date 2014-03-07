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
                if (alpha > 0) {
                    ctx.strokeStyle = DQX.getRGB(0, 0, 0, 0.5 * alpha);
                    //var col_index = data.snp_cache.colour_table;
                    //var get_col_index = data.snp_cache.snp_col_index;
                    for (var i = 0, end = pos.length; i < end; ++i) {
                       var p = pos[i];
//                        var selected = _.contains(view.selected_snps, i);
//                        var colour = col_index[get_col_index(snps.ref_total[i], snps.alt_total[i])];
                        var colour = '#000000';
                        ctx.save();
                        ctx.translate(scale(p) - 0.5*snp_width, 20);
                        ctx.beginPath();
                        ctx.moveTo(0,0);
                        ctx.bezierCurveTo(0, -10, 0.5*snp_width, -10, 0.5*snp_width, -20);
                        ctx.bezierCurveTo(0.5*snp_width, -10, snp_width, -10, snp_width, 0);
                        ctx.closePath();
                        ctx.fillStyle = colour;
//                        ctx.lineWidth = selected ? 2 : 1;
                        ctx.lineWidth = 1;
                        ctx.fill();
                        ctx.stroke();
//                        var tot = snps.ref_total[i] + snps.alt_total[i];
//                        if (tot > 0) {
//                            var a = (that.height - 20) * (snps.alt_total[i] / tot);
//                            var r = (that.height - 20) * (snps.ref_total[i] / tot);
//                            ctx.fillStyle = "#F00";
//                            ctx.fillRect(scale(i), 20, scale(p+ 1) - scale(i), a);
//                            ctx.fillStyle = "#00F";
//                            ctx.fillRect(scale(i), 20 + a, scale(p+ 1) - scale(i), r);
//                        }
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(snp_width, 0);
                        ctx.lineTo(snp_width, that.height-20);
                        ctx.lineTo(0, that.height-20);
                        ctx.closePath();
                        ctx.stroke();
//                        if (!selected) {
//                            ctx.fillStyle = "rgba(255,255,255,0.75)";
//                            ctx.fill();
//                        }
                        ctx.restore();
                    }
                } else
                //Text
                    alpha = tween.manual(snp_width, 7, 10);
                if (alpha > 0) {
                    var offset = 0;
                    if (snp_width > 36)
                        offset = -6;
                    if (snp_width > 48)
                        offset = -12;
                    var e = tween.Easing.Linear.None;
                    var font_size = tween.manual(snp_width, 7, 15, e, 5, 12);
                    var angle = tween.manual(snp_width, 58, 68, e, -90, 0);
                    var y = tween.manual(snp_width, 58, 68, e, 0, -24);
                    var x = tween.manual(snp_width, 58, 68, e, 0, -24);
                    ctx.font = "" + font_size + "px sans-serif";
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = DQX.getRGB(0, 0, 0, alpha);
                    ctx.textBaseline = 'middle';
                    var asc = String.fromCharCode;
                    for (i = 0, end = pos.length; i < end; ++i) {
                         p = pos[i];
//                      //TODO Don't need to do this - just iterate over selected
//                        var snp_selected = _.contains(view.selected_snps, i);
                        ctx.save();
                        ctx.translate(scale(p), 70);
                        ctx.rotate((angle / 360) * (2 * Math.PI));
//                        if (snp_selected) {
//                            ctx.font = "bold " + font_size + "px sans-serif";
//                            ctx.fillStyle = DQX.getRGB(255, 255, 255, alpha);
//                        }
//                        else {
                            ctx.font = "" + font_size + "px sans-serif";
                            ctx.fillStyle = DQX.getRGB(0, 0, 0, alpha);
//                        }
                        //NO MUTATION NAMES FROM VCF
//            if (snp_selected) ctx.strokeText(snp.mutation, x, y + offset);
//            ctx.fillText(snp.mutation, x, y + offset);
//                        if (offset <= -6) {
//                            if (snp_selected) ctx.strokeText(asc(snps.ref[i]) + '→' + asc(snps.alt[i]), x, y + offset + 15);
//                            ctx.fillText(asc(snps.ref[i]) + '→' + asc(snps.alt[i]), x, y + offset + 15);
//                        }
                        if (offset <= -12) {
//                            if (snp_selected) ctx.strokeText(pos[i], x, y + offset + 30);
                            ctx.fillText(ord[i], x, y + offset + 30);
                        }
                        ctx.restore()
                    }
                }

//        //Full length lines
//        ctx.lineWidth = 1;
//        alpha = tween.manual(snp_width, 10, 20, e, 0, 0.50);
//        if (alpha > 0) {
//          ctx.strokeStyle = DQX.getRGB(0, 0, 0, alpha);
//          for (i = view.start_snp, end = view.end_snp; i < end; ++i) {
//            ctx.moveTo(scale(i), that.height + (view.stack.bounding_box.b - view.stack.bounding_box.t));
//            ctx.lineTo(scale(i), 20);
//          }
//          ctx.moveTo(scale(snps.length), that.height + (view.stack.bounding_box.b - view.stack.bounding_box.t));
//          ctx.lineTo(scale(snps.length), 20);
//          ctx.stroke();
//        }
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
                    that.view.rescaleSNPic(that.view.snp_scale.scale_clamp(that.view.snp_scale.zoom(delta, pos.x), 0, that.data.snp_cache.snp_positions.length));
                    return true;
                }
                return false
            };
            return that;
        };
    }
);