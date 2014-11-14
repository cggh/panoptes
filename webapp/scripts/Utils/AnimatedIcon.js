// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([],
    function () {
        return function AnimatedIcon(url, width, height, num_frames, cycleTime) {
            window.requestAnimationFrame = window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function(callback) {
                    return window.setTimeout(callback, 1000 / 60);
                };

            var that = {};
            that.init = function (url, width, height, num_frames, cycleTime) {

                that.image = new Image();
                that.image.src = url;
                that.image.onload = function () {
                    that.loaded = true;
                };
                that.height = height;
                that.width = width;
                that.num_frames = num_frames;
                that.cycleTime = cycleTime;
            };

            that.drawTo = function(context, x, y, time) {
                that.startTime = that.startTime || time;
                var frame = Math.floor((((time-that.startTime) / cycleTime) * num_frames) % num_frames);
                context.drawImage(that.image, that.width*frame,  0, that.width, that.height, x, y, that.width, that.height);
            };
            that.init(url, width, height, num_frames, cycleTime);
            return that;
        };
    }
);


