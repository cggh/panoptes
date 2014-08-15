// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([],
    function () {
        var count = 0;
        return function RequestCounter() {
            var that = {};
            that.increment = function()  {
                count += 1;
            };

            that.decrement = function()  {
                count -= 1;
            };

            that.free = function() {
                return count < 5;
            };
            return that
        };
    }
);