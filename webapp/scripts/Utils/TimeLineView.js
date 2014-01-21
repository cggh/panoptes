define([
    "require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/ChannelPlot/ChannelPlotter", "DQX/ChannelPlot/ChannelCanvas"
],
    function (
        require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, ChannelPlotter, ChannelCanvas
        ) {

        var TimeLineView = {};



        TimeLineView.ChannelScale = function (itimeLine) {
            var that = ChannelCanvas.Base('_TimeScale');
            that._height = 28;
            that.myTimeLine = itimeLine;

            that.draw = function (drawInfo) {
                if ((!that.myTimeLine.minJD) && (!that.myTimeLine.maxJD))
                    return;
                this.drawStandardGradientCenter(drawInfo, 0.84);
                this.drawStandardGradientLeft(drawInfo, 0.84);
                this.drawStandardGradientRight(drawInfo, 0.84);

                drawInfo.centerContext.fillStyle = DQX.Color(0.3, 0.3, 0.3).toString();
                drawInfo.centerContext.font = '11px sans-serif';
                drawInfo.centerContext.textBaseline = 'top';
                drawInfo.centerContext.textAlign = 'center';

                var dist,shear;
                var optimDist = 100;
                var minShear = 1.0e9;
                var calcShear = function(dst) {
                    return Math.abs(dst/optimDist-1.0);
                }
                var namedDays = null;
                var monthInterval = null;
                var yearInterval = null;

                // try each 2 days
                dist = 2*drawInfo.zoomFactX;
                shear = calcShear(dist);
                if (shear<minShear) {
                    minShear = shear;
                    namedDays = [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30];
                }

                // try each 5 days
                dist = 5*drawInfo.zoomFactX;
                shear = calcShear(dist);
                if (shear<minShear) {
                    minShear = shear;
                    namedDays = [1,5,10,15,20,25];
                }

                // try each 10 days
                dist = 10*drawInfo.zoomFactX;
                shear = calcShear(dist);
                if (shear<minShear) {
                    minShear = shear;
                    namedDays = [1,10,20];
                }

                // try each 15 days
                dist = 15*drawInfo.zoomFactX;
                shear = calcShear(dist);
                if (shear<minShear) {
                    minShear = shear;
                    namedDays = [1,15];
                }

                // try month multiples
                $.each([1,2,3,6,12], function(idx, mult) {
                    dist = mult*30*drawInfo.zoomFactX;
                    shear = calcShear(dist)
                    if (shear<minShear) {
                        minShear = shear;
                        monthInterval = mult;
                        namedDays = null;
                        yearInterval = null;
                    }
                })

                // try year multiples
                $.each([1,2,5,10], function(idx, mult) {
                    dist = mult*365*drawInfo.zoomFactX;
                    shear = calcShear(dist)
                    if (shear<minShear) {
                        minShear = shear;
                        monthInterval = null;
                        namedDays = null;
                        yearInterval = mult;
                    }
                })

                var pad = function(n) {return n<10 ? '0'+n : n};

                var JD1IntMin = Math.floor(that.myTimeLine.minJD);
                var JD1IntMax = Math.ceil(that.myTimeLine.maxJD);
                for (JDInt = JD1IntMin; JDInt<= JD1IntMax; JDInt++) {
                    var psx = Math.round((JDInt+0.6-that.myTimeLine.minJD) * drawInfo.zoomFactX - drawInfo.offsetX) + 0.5;
                    var dt = DQX.JD2DateTime(JDInt+0.6);
                    var year = dt.getUTCFullYear();
                    var month = dt.getUTCMonth() + 1;
                    var day = dt.getUTCDate();
                    var writeText = false;
                    if (yearInterval) {
                        writeText = (year%yearInterval == 0) && (month==1) &&(day==1);
                    }
                    else if (monthInterval) {
                        writeText = ((month-1)%monthInterval == 0) && (day==1);
                    } else {
                        writeText = namedDays.indexOf(day)>=0;
                    }
                    if (writeText) {
                        var st1 = year;
                        drawInfo.centerContext.fillText(st1, psx, 1);
                        if (!yearInterval) {
                            var st2 = pad(month)+'-'+pad(day);
                            drawInfo.centerContext.fillText(st2, psx, 11);
                        }
                    }
                }

/*
                var i1 = Math.round(((-50 + drawInfo.offsetX) / drawInfo.zoomFactX) / drawInfo.HorAxisScaleJumps.Jump1);
                if (i1 < 0) i1 = 0;
                var i2 = Math.round(((drawInfo.sizeCenterX + 50 + drawInfo.offsetX) / drawInfo.zoomFactX) / drawInfo.HorAxisScaleJumps.Jump1);

                for (i = i1; i <= i2; i++) {
                    drawInfo.centerContext.beginPath();
                    var value = i * drawInfo.HorAxisScaleJumps.Jump1;
                    var psx = Math.round((value) * drawInfo.zoomFactX - drawInfo.offsetX) + 0.5;
                    if ((psx >= -50) && (psx <= drawInfo.sizeCenterX + 50)) {
                        if (i % drawInfo.HorAxisScaleJumps.JumpReduc == 0) {
                            drawInfo.centerContext.strokeStyle = DQX.Color(0.1, 0.1, 0.1).toString();
                            drawInfo.centerContext.moveTo(psx, 19);
                            drawInfo.centerContext.lineTo(psx, 25);
                            drawInfo.centerContext.stroke();
                            drawInfo.centerContext.fillText((value), psx, 7);
                        }
                        else {
                            drawInfo.centerContext.strokeStyle = DQX.Color(0.3, 0.3, 0.3).toString();
                            drawInfo.centerContext.moveTo(psx, 22);
                            drawInfo.centerContext.lineTo(psx, 25);
                            drawInfo.centerContext.stroke();
                        }
                    }
                }
*/
                this.drawMark(drawInfo, true);
            }

            return that;
        }



        TimeLineView.ChannelData = function (itimeLine) {
            var that = ChannelCanvas.Base('_TimeData');
            that.myTimeLine = itimeLine;
            that._height = 25;
            that.setAutoFillHeight(true);

            that.draw = function (drawInfo) {
                this.drawStandardGradientCenter(drawInfo, 1);
                this.drawStandardGradientLeft(drawInfo, 0.84);
                this.drawStandardGradientRight(drawInfo, 0.84);

                drawInfo.centerContext.fillStyle = DQX.Color(0.3, 0.3, 0.3).toString();
                drawInfo.centerContext.font = '11px sans-serif';
                drawInfo.centerContext.textBaseline = 'top';
                drawInfo.centerContext.textAlign = 'center';
                this.drawMark(drawInfo, true);
            }

            return that;
        }


        TimeLineView.Create = function(iParentRef) {
            var that = ChannelPlotter.Panel(iParentRef, { hasHeader: false, hasFooter: false, hasXScale: false});
            that.scaleConversionFactor = 1.0;

            that.addChannel(TimeLineView.ChannelScale(that), true);
            that.addChannel(TimeLineView.ChannelData(that), true);

            that.handleResize();

            that.setPoints = function(ipointset, iSettings) {
                that.myPointSet = ipointset;

                var minJD = 1.0E99;
                var maxJD = -1.0E99;
                $.each(that.myPointSet, function(idx, pt) {
                    minJD = Math.min(minJD, pt.dateJD);
                    maxJD = Math.max(maxJD, pt.dateJD);
                })
                if ( (!that.minJD) || (!that.maxJD) || (Math.abs(that.minJD-minJD)>0.001) || (Math.abs(that.maxJD-maxJD)>0.001) ) {
                    that.minJD = minJD;
                    that.maxJD = maxJD;
                    that.rangeJD = that.maxJD - that.minJD;
                    that.setRange(0,that.rangeJD);
                }
            };

            that.clearPoints = function() {
                this.myPointSet = [];
            };

            that.draw = function() {
                that.render();
            }

            return that;
        }



        return TimeLineView;
    });


