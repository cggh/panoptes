define(["lodash"],
    function (_) {
        return function TouchEvents(element, callbacks) {
            var that = {};
            that.element = element;
            that.callbacks = callbacks;

            that.getCenter = function(touches) {
                var valuesX = [], valuesY = [];
                touches.forEach(function(touch) {
                    valuesX.push(touch.pos.x);
                    valuesY.push(touch.pos.y);
                });
                return {
                    x: ((Math.min.apply(Math, valuesX) + Math.max.apply(Math, valuesX)) / 2),
                    y: ((Math.min.apply(Math, valuesY) + Math.max.apply(Math, valuesY)) / 2)
                };
            };
            that.eventDistance = function(ev1, ev2) {
                var x = (ev1.touches[0].pos.x - ev2.touches[0].pos.x);
                var y = (ev1.touches[0].pos.y - ev2.touches[0].pos.y);
                return Math.sqrt(x*x + y*y);
            };
            that.forceTouches = function(ev) {
                if (!ev.touches)
                    if (!ev.originalEvent.touches)
                        ev.touches = [ev.originalEvent];
                    else
                        ev.touches = ev.originalEvent.touches;
                // Make touches a normal array
                var t = [];
                $.each(ev.touches, function(i, touch){
                    t.push(touch);
                });
                ev.touches = t;
                //Force the touches to be relative to our element
                ev.touches.forEach(function(touch, i) {
                    if (!touch.identifier)
                        touch.identifier = i;
                    touch.pos = {x:touch.pageX - $(that.element).offset().left,
                        y: touch.pageY - $(that.element).offset().top};
                });
                ev.center = that.getCenter(ev.touches);
            };
            that.touchStart = function(ev) {
                ev = _.cloneDeep(ev);
                that.forceTouches(ev);
                that.touchStartEv = ev;
                $(document).bind("touchend.Genotypes mouseup.Genotypes", that.touchEnd);
                $(document).bind("touchmove.Genotypes mousemove.Genotypes", that.touchMove);
                ev.returnValue = false;
                return false;
            };
            that.touchEnd = function(ev) {
                ev = _.cloneDeep(ev);
                that.forceTouches(ev);
                if (that.touchStartEv) {
                    if (that.touchDragging) {
                        that.touchDragging = false;
                        that.callbacks.dragEnd(ev)
                    } else {
                        var t = ev.timeStamp - that.touchStartEv.timeStamp;
                        if (t < 300)
                            that.tap(that.touchStartEv);
                    }
                }
                $(document).unbind("touchend.Genotypes mouseup.Genotypes");
                $(document).unbind("touchmove.Genotypes mousemove.Genotypes");
                ev.returnValue = false;
                that.touchStartEv = null;
                return false;
            };
            that.touchMove = function(ev) {
                ev = _.cloneDeep(ev);
                that.forceTouches(ev);
                if (!that.touchStartEv) {
                    that.touchStartEv = ev;
                } else {
                    var t = ev.timeStamp - that.touchStartEv.timeStamp;
                    var dist = that.eventDistance(ev, that.touchStartEv);
                    if (t >= 250 || dist > 20) {
                        if (!that.touchDragging) {
                            that.callbacks.dragStart(that.touchStartEv);
                            that.touchDragging = true;
                        }
                        that.callbacks.dragMove(ev);
                    }
                }
                ev.returnValue = false;
                return false;
            };
            that.tap = function(ev) {
                if (that.lastTap) {
                    var dist = that.eventDistance(ev, that.lastTap);
                    if (ev.timeStamp - that.lastTap.timeStamp < 300 && dist < 5) {
                        that.callbacks.doubleclick(ev);
                        that.lastTap = null;
                        return;
                    }
                }
                that.lastTap = ev;
                that.callbacks.click(ev)
            };

            that.element.bind('DOMMouseScroll mousewheel', function(ev) {
                that.forceTouches(ev);
                that.callbacks.mouseWheel(ev);
            });
            that.element.on('touchstart mousedown', that.touchStart);

            return that;
        };
    }
);
