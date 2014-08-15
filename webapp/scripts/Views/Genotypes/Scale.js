// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["d3","tween"],
    function (d3, tween) {
        return function Scale() {
            var that = d3.scale.linear().domain([0, 0]).range([0,0]);

            that.tweenTo = function (target) {
                if (that.currentTween) tween.remove(that.tween);
                that.currentTarget = target;
                that.currentTween = new tween.Tween({left: that.domain()[0], right: that.domain()[1]})
                    .to(target , 200)
                    .onUpdate(function () {
                        that.domain([this.left, this.right]);
                    })
                    .easing(tween.Easing.Sinusoidal.InOut)
                    .start()
                    .onComplete(function () {
                        delete that.currentTween;
                    });
            };
            //Returns current tween target or if no tween then current
            that.targetDomain = function() {
              if (that.currentTween)
                return [that.currentTarget.left, that.currentTarget.right];
              else
                return that.domain();
            };

            that.scale_clamp = function(target, min, max) {
                if (target.left <= min && target.right >= max) {
                    target.left = min;
                    target.right = max;
                }
                else {
                    var dt = target.right - target.left;
                    if (target.left < min) {
                        target.left = min;
                        target.right = target.left + dt;
                        if (target.right > max)
                            target.right = max;
                    }
                    if (target.right > max) {
                        target.right = max;
                        target.left = target.right - dt;
                        if (target.left < min)
                            target.left = min;
                    }
                }
                return target;
            };
            that.scale_min_width = function(target, min_width) {
                var width = target.right - target.left;
                if (width < min_width){
                    target.left -= (min_width-width)/2;
                    target.right += (min_width-width)/2;
                }
                return target;
            };

            that.zoom = function(delta, pos) {
                var scaleFactor  = 1;
                if (delta < 0)//zoom out
                    scaleFactor = 1.0 / (1.0 + 0.4 * Math.abs(delta));
                else//zoom in
                    scaleFactor = 1.0 + 0.4 * Math.abs(delta);
                //Use the endpoint of the tween if we have one
                var left = that.currentTween ? that.currentTarget.left : that.domain()[0];
                var right = that.currentTween ? that.currentTarget.right : that.domain()[1];
                pos = (pos != undefined) ? that.invert(pos) : left+((right-left)/2);
                var frac_x = (pos - left) / (right - left);
                var new_width = (right - left)/scaleFactor;
                var target = {left: pos - (new_width*frac_x), right: pos + (new_width*(1-frac_x))};
                //target = that.scale_clamp(target, that.data.gene_info.start, that.data.gene_info.stop);
                //target = that.scale_min_width(target, 100);
                that.tweenTo(target);
                return target;
            };

            that.startDrag = function(startTouches) {
                that.startScale = that.copy();
                that.startDragTouches = startTouches;
                if (that.currentTween) tween.remove(that.currentTween);
            };

            that.dragMove = function(currentTouches) {
                var touchesByID = DQX.attrMap(currentTouches, 'identifier');
                //Add new touches to the start list
                var startTouchesByID = DQX.attrMap(that.startDragTouches, 'identifier');
                currentTouches.forEach(function(touch) {
                    if (!startTouchesByID[touch.identifier])
                        that.startDragTouches.push(touch);
                });
                var startTouches = that.startDragTouches;
                var startScale = that.startScale;
                var scale = 1;
                //Translate using the first finger down
                var firstTouchx = startTouches[0].pos.x;
                var firstTouchx2 = touchesByID[startTouches[0].identifier].pos.x;
                var translate = startScale.invert(firstTouchx) - startScale.invert(firstTouchx2);
                if(currentTouches.length > 1) {
                    var secondTouchx = currentTouches[1].pos.x;
                    var secondTouchx2 = startTouchesByID[currentTouches[1].identifier].pos.x;
                    scale = (firstTouchx2 - secondTouchx2) / (firstTouchx - secondTouchx)
                }
                var pos = startScale.invert(firstTouchx);
                var left = startScale.domain()[0] + translate, right = startScale.domain()[1] + translate;
                var frac_x =  (pos - left) / (right - left);
                var new_width = (right - left)/scale;
                var target =  {left: pos - (new_width*frac_x), right: pos + (new_width*(1-frac_x))};
                that.domain([target.left, target.right]);

                return target;
            };

            return that;
        }
    }
);
