define(["require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData", "Utils/QueryTool", "Plots/GenericPlot"],
    function (require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData, QueryTool, GenericPlot) {

        var Histogram = {};



        GenericPlot.registerPlotType('histogram', Histogram);

        Histogram.Create = function(tableid) {
            var that = GenericPlot.Create(tableid,'histogram', {title:'Histogram' });
            that.fetchCount = 0;
            that.showRelative = false;


            that.barW = 16;
            that.scaleW = 100;
            that.textH = 130;


            var eventid = DQX.getNextUniqueID();that.eventids.push(eventid);
            Msg.listen(eventid,{ type: 'SelectionUpdated'}, function(scope,tableid) {
                if (that.tableInfo.id==tableid)
                    that.reDraw();
            } );


            that.createFrames = function() {
                that.frameRoot.makeGroupHor();
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setAllowScrollBars(false,true);
                that.framePlot = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(true,false);
            };

            that.createPanels = function() {
                that.panelPlot = FrameCanvas(that.framePlot);
                that.panelPlot.draw = that.draw;
                that.panelPlot.getToolTipInfo = that.getToolTipInfo;
                that.panelPlot.onMouseClick = that.onMouseClick;
                that.panelPlot.onSelected = that.onSelected;
                that.panelPlot.selectionHorOnly = true;
                that.panelButtons = Framework.Form(that.frameButtons).setPadding(5);

                var ctrl_Query = that.theQuery.createControl();

                var propList = [ {id:'', name:'-- None --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    var included = false;
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.datatype=='Value') ) )
                        propList.push({ id:prop.propid, name:prop.name });
                });
                that.ctrlValueProperty = Controls.Combo(null,{ label:'Value:', states: propList }).setClassID('value');
                that.ctrlValueProperty.setOnChanged(function() {
                    that.fetchData();
                });

                that.ctrl_binsizeAutomatic = Controls.Check(null,{label:'Automatic', value:true}).setClassID('binsizeautomatic').setOnChanged(function() {
                    that.ctrl_binsizeValue.modifyEnabled(!that.ctrl_binsizeAutomatic.getValue());
                    that.ctrl_binsizeUpdate.modifyEnabled(!that.ctrl_binsizeAutomatic.getValue());
                    if (that.ctrl_binsizeAutomatic.getValue())
                        that.fetchData();
                });

                that.ctrl_binsizeValue = Controls.Edit(null,{size:18}).setClassID('binsizevalue').setOnChanged(function() {

                });
                that.ctrl_binsizeValue.modifyEnabled(false);

                that.ctrl_binsizeUpdate = Controls.Button(null,{content:'Update'}).setOnChanged(function() {
                    that.fetchData();
                });
                that.ctrl_binsizeUpdate.modifyEnabled(false);

                var binsizeGroup = Controls.CompoundVert([that.ctrl_binsizeAutomatic, that.ctrl_binsizeValue, that.ctrl_binsizeUpdate]).setLegend('Bin size');

                var controlsGroup = Controls.CompoundVert([
                    ctrl_Query,
                    Controls.VerticalSeparator(20),
                    that.ctrlValueProperty,
                    Controls.VerticalSeparator(20),
                    binsizeGroup
                ]);
                that.addPlotSettingsControl('controls',controlsGroup);
                that.panelButtons.addControl(controlsGroup);

            };

            that.setActiveQuery = function(qry) {
                that.theQuery.modify(qry);
            }

            that.updateQuery = function() {
                that.fetchData();
            }


            that.reloadAll = function() {
                that.fetchData();
            }

            that.fetchData = function() {
                that.propidValue = that.ctrlValueProperty.getValue();
                if (that.staging)
                    return;
                that.bucketCounts = null;
                if (!that.propidValue) {
                    that.reDraw();
                    return;
                }

                DQX.setProcessing();
                var data ={};
                data.database = MetaData.database;
                data.workspaceid = MetaData.workspaceid;
                data.tableid = that.tableInfo.id + 'CMB_' + MetaData.workspaceid;
                data.propid = that.propidValue;
                data.qry = SQL.WhereClause.encode(that.theQuery.get());
                if (!that.ctrl_binsizeAutomatic.getValue())
                    data.binsize = that.ctrl_binsizeValue.getValue();
                DQX.customRequest(MetaData.serverUrl,'uploadtracks','histogram', data, function(resp) {
                    DQX.stopProcessing();
                    if ('Error' in resp) {
                        alert(resp.Error);
                        return;
                    }

                    if (!resp.hasdata) {
                        alert('No data in the result set');
                        that.reDraw();
                        return;
                    }

                    var decoder = DataDecoders.ValueListDecoder();
                    var buckets = decoder.doDecode(resp.buckets);
                    var counts = decoder.doDecode(resp.counts);
                    that.bucketSize = resp.binsize;


                    var bucketMin = 1.0e99;
                    var bucketMax = -1.0e99;
                    $.each(buckets,function(idx,vl) {
                        if (vl<bucketMin)
                            bucketMin=vl;
                        if (vl>bucketMax)
                            bucketMax=vl;
                    });

                    that.bucketNrOffset = bucketMin;
                    that.bucketCounts=[];
                    that.maxCount = 1;
                    for (var i=bucketMin; i<=bucketMax; i++)
                        that.bucketCounts.push(0);
                    for (var i=0; i<buckets.length; i++) {
                        that.bucketCounts[buckets[i]-bucketMin] = counts[i];
                        if (that.maxCount<counts[i])
                            that.maxCount=counts[i]
                    }

                    if (that.ctrl_binsizeAutomatic.getValue())
                        that.ctrl_binsizeValue.modifyValue(that.bucketSize);


                    that.reDraw();
                });

            }



            that.reloadAll = function() {
                that.fetchData();
            }

            that.reDraw = function() {
                that.panelPlot.invalidate();
            }



            that.draw = function(drawInfo) {
                that.drawImpl(drawInfo);
            }

            that.drawImpl = function(drawInfo) {


                that.plotPresent = false;
                var ctx = drawInfo.ctx;

                var marginX = 40;
                var marginY = 40;
                ctx.fillStyle="rgb(220,220,220)";
                ctx.fillRect(0,0,marginX,drawInfo.sizeY);
                ctx.fillRect(0,drawInfo.sizeY-marginY,drawInfo.sizeX,marginY);

                if (!that.bucketCounts)
                    return;

                var XMin = that.bucketNrOffset*that.bucketSize;
                var XMax = (that.bucketNrOffset+that.bucketCounts.length)*that.bucketSize;
                var XRange = XMax - XMin;
                XMin -= 0.1*XRange;
                XMax += 0.1*XRange;
                var YMin = 0;
                var YMax = that.maxCount*1.1;
                var scaleX = (drawInfo.sizeX-marginX) / (XMax - XMin);
                var offsetX = marginX - XMin*scaleX;
                var scaleY = - (drawInfo.sizeY-marginY) / (YMax - YMin);
                var offsetY = (drawInfo.sizeY-marginY) - YMin*scaleY;
                that.scaleX = scaleX; that.offsetX = offsetX;
                that.scaleY = scaleY; that.offsetY = offsetY;

                // Draw x scale
                ctx.save();
                ctx.font="10px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                var scale = DQX.DrawUtil.getScaleJump(30/scaleX);
                for (var i=Math.ceil(XMin/scale.Jump1); i<=Math.floor(XMax/scale.Jump1); i++) {
                    var vl = i*scale.Jump1;
                    var px = Math.round(vl * scaleX + offsetX)-0.5;
                    ctx.strokeStyle = "rgb(230,230,230)";
                    if (i%scale.JumpReduc==0)
                        ctx.strokeStyle = "rgb(190,190,190)";
                    ctx.beginPath();
                    ctx.moveTo(px,0);
                    ctx.lineTo(px,drawInfo.sizeY-marginY);
                    ctx.stroke();
                    if (i%scale.JumpReduc==0) {
                        ctx.fillText(scale.value2String(vl),px,drawInfo.sizeY-marginY+13);
                    }
                }
                ctx.restore();

                // Draw y scale
                ctx.save();
                ctx.font="10px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                var scale = DQX.DrawUtil.getScaleJump(30/Math.abs(scaleY));
                for (var i=Math.ceil(YMin/scale.Jump1); i<=Math.floor(YMax/scale.Jump1); i++) {
                    var vl = i*scale.Jump1;
                    var py = Math.round(vl * scaleY + offsetY)-0.5;
                    ctx.strokeStyle = "rgb(230,230,230)";
                    if (i%scale.JumpReduc==0)
                        ctx.strokeStyle = "rgb(190,190,190)";
                    ctx.beginPath();
                    ctx.moveTo(marginX,py);
                    ctx.lineTo(drawInfo.sizeX,py);
                    ctx.stroke();
                    if (i%scale.JumpReduc==0) {
                        ctx.save();
                        ctx.translate(marginX-5,py);
                        ctx.rotate(-Math.PI/2);
                        ctx.fillText(scale.value2String(vl),0,0);
                        ctx.restore();
                    }
                }
                ctx.restore();

                ctx.fillStyle="rgb(190,190,190)";
                $.each(that.bucketCounts, function(bidx, val) {
                    var x1 = (that.bucketNrOffset+bidx+0)*that.bucketSize;
                    var x2 = (that.bucketNrOffset+bidx+1)*that.bucketSize;
                    var px1 = Math.round(x1 * scaleX + offsetX)-0.5;
                    var px2 = Math.round(x2 * scaleX + offsetX)-0.5;
                    var py1 = Math.round(0 * scaleY + offsetY)-0.5;
                    var py2 = Math.round(val * scaleY + offsetY)-0.5;
                    ctx.beginPath();
                    ctx.moveTo(px1, py2);
                    ctx.lineTo(px1, py1);
                    ctx.lineTo(px2, py1);
                    ctx.lineTo(px2, py2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                });


                that.plotPresent = true;
            };

            that.getToolTipInfo = function(px0 ,py0) {
                if (!that.plotPresent) return null;
                var tooltip = null;
                $.each(that.bucketCounts, function(bidx, val) {
                    var x1 = (that.bucketNrOffset+bidx+0)*that.bucketSize;
                    var x2 = (that.bucketNrOffset+bidx+1)*that.bucketSize;
                    var px1 = Math.round(x1 * that.scaleX + that.offsetX)-0.5;
                    var px2 = Math.round(x2 * that.scaleX + that.offsetX)-0.5;
                    var py1 = Math.round(0 * that.scaleY + that.offsetY)-0.5;
                    var py2 = Math.round(val * that.scaleY + that.offsetY)-0.5;
                    if ( (px0>=px1) && (px0<=px2) && (val>0) ) {
                        var str = '';
                        str += 'Count: '+val;
                        tooltip = {
                            ID: 'IDX'+bidx,
                            px: (px1+px2)/2,
                            py: py2,
                            showPointer:true,
                            content: str,
                            count: val,
                            minval:x1,
                            maxval:x2
                        };
                    }
                });
                return tooltip;
            };

            that.onMouseClick = function(ev, info) {
                var tooltip = that.getToolTipInfo(info.x, info.y);
                if (tooltip) {
                    var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Show items in table",  width:120, height:30 }).setOnChanged(function() {
                        var tableView = Application.getView('table_'+that.tableInfo.id);
                        var qry= SQL.WhereClause.AND([
                            SQL.WhereClause.CompareFixed(that.propidValue,'>=',tooltip.minval),
                            SQL.WhereClause.CompareFixed(that.propidValue,'<',tooltip.maxval)
                        ]);
                        if (!that.theQuery.get().isTrivial)
                            qry.addComponent(that.theQuery.get());
                        tableView.activateWithQuery(qry);
                        Popup.closeIfNeeded(popupid);
                    });
                    var content = 'Number of items: '+tooltip.count;
                    content += '<br/>' + bt.renderHtml();
                    var popupid = Popup.create('Histogram bar', content);
                }
            }

            that.onSelected = function(minX, minY, maxX, maxY, shiftPressed, controlPressed, altPressed) {
                var bt1 = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Show items in range in table",  width:120, height:30 }).setOnChanged(function() {
                    var tableView = Application.getView('table_'+that.tableInfo.id);
                    var qry= SQL.WhereClause.AND([]);
                    if (!that.theQuery.get().isTrivial)
                        qry.addComponent(that.theQuery.get());
                    qry.addComponent(SQL.WhereClause.CompareFixed(that.propidValue,'>=',rangeMin));
                        qry.addComponent(SQL.WhereClause.CompareFixed(that.propidValue,'<',rangeMax));
                    tableView.activateWithQuery(qry);
                    Popup.closeIfNeeded(popupid);
                });
                var bt2 = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Restrict plot dataset to range",  width:120, height:30 }).setOnChanged(function() {
                    var qry= SQL.WhereClause.AND([]);
                    if (!that.theQuery.get().isTrivial)
                        qry.addComponent(that.theQuery.get());
                    qry.addComponent(SQL.WhereClause.CompareFixed(that.propidValue,'>=',rangeMin));
                    qry.addComponent(SQL.WhereClause.CompareFixed(that.propidValue,'<',rangeMax));
                    that.setActiveQuery(qry);
                    Popup.closeIfNeeded(popupid);
                });
                var rangeMin = (minX-that.offsetX)/that.scaleX;
                var rangeMax = (maxX-that.offsetX)/that.scaleX;
                var content = 'Range: '+rangeMin+' - '+rangeMax+'<br>';
                content +=  bt1.renderHtml() + bt2.renderHtml();
                var popupid = Popup.create('Histogram area', content);
            }


            that.theQuery.notifyQueryUpdated = that.updateQuery;
            that.create();
            return that;
        }



        return Histogram;
    });


