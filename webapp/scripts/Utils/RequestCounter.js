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