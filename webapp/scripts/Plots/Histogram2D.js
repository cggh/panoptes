define(["require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData", "Utils/QueryTool", "Plots/GenericPlot"],
    function (require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData, QueryTool, GenericPlot) {

        var Histogram2D = {};


        var paletteList = ['Gray', 'Gray (inverted)', 'Rainbow 1', 'Rainbow 2', 'Heath'];

        function getPaletteColor(name,fr) {
            if (fr<0) fr=0;
            if (fr>1) fr=1;
            if (name=='Gray (inverted)')
                return DQX.Color(fr,fr,fr);

            if (name=='Rainbow 1') {
                var cl = DQX.HSL2Color(0.5-fr*0.75,1,0.5);
                return cl;
            }

            if (name=='Rainbow 2') {
                var cl = DQX.HSL2Color(0.5-fr*0.75,1,0.5);
                if (fr<0.2)
                    cl=cl.lighten(1-fr/0.2);
                return cl;
            }

            if (name=='Heath') {
                return DQX.Color(1-Math.pow(Math.max(fr-0.66,0)/(1-0.66),2),1-Math.pow(Math.max(fr-0.33,0)/(1-0.33),0.8),1-Math.pow(fr,0.6));
            }


            return DQX.Color(1-fr,1-fr,1-fr);
        }


        GenericPlot.registerPlotType('histogram2d', Histogram2D);

        Histogram2D.Create = function(tableid) {
            var that = GenericPlot.Create(tableid,'histogram2d', {title:'2D Histogram' });
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
                that.panelButtons = Framework.Form(that.frameButtons).setPadding(5);

                var ctrl_Query = that.theQuery.createControl();

                var propList = [ {id:'', name:'-- None --'}];
                $.each(MetaData.customProperties, function(idx, prop) {
                    var included = false;
                    if ( (prop.tableid==that.tableInfo.id) && ( (prop.datatype=='Value') ) )
                        propList.push({ id:prop.propid, name:prop.name });
                });
                that.ctrlValueXProperty = Controls.Combo(null,{ label:'X Value:', states: propList }).setClassID('xvalue');
                that.ctrlValueXProperty.setOnChanged(function() {
                    that.fetchData();
                });
                that.ctrlValueYProperty = Controls.Combo(null,{ label:'Y Value:', states: propList }).setClassID('yvalue');
                that.ctrlValueYProperty.setOnChanged(function() {
                    that.fetchData();
                });

                that.ctrl_binsizeAutomatic = Controls.Check(null,{label:'Automatic', value:true}).setClassID('autobinsize').setOnChanged(function() {
                    that.ctrl_binsizeValueX.modifyEnabled(!that.ctrl_binsizeAutomatic.getValue());
                    that.ctrl_binsizeValueY.modifyEnabled(!that.ctrl_binsizeAutomatic.getValue());
                    that.ctrl_binsizeUpdate.modifyEnabled(!that.ctrl_binsizeAutomatic.getValue());
                    if (that.ctrl_binsizeAutomatic.getValue())
                        that.fetchData();
                });

                that.ctrl_binsizeValueX = Controls.Edit(null,{size:12, label:'X:'}).setClassID('binsizex').modifyEnabled(false);
                that.ctrl_binsizeValueY = Controls.Edit(null,{size:12, label:'Y:'}).setClassID('binsizey').modifyEnabled(false);

                that.ctrl_binsizeUpdate = Controls.Button(null,{content:'Update'}).setOnChanged(function() {
                    that.fetchData();
                });
                that.ctrl_binsizeUpdate.modifyEnabled(false);

                var binsizeGroup = Controls.CompoundVert([that.ctrl_binsizeAutomatic, that.ctrl_binsizeValueX, that.ctrl_binsizeValueY, that.ctrl_binsizeUpdate]).setLegend('Bin size');

                var colormaplist = [];
                $.each(paletteList, function(idx,name) {
                    colormaplist.push({id:name, name:name});
                });
                that.ctrlPalette = Controls.Combo(null,{label:'Colors', states:colormaplist, value:'Gray'}).setClassID('color').setOnChanged(function() {
                    that.reDraw();
                });

                that.ctrlMappingStyle = Controls.Combo(null,{label:'Mapping', states:[{id:'lin',name:'Linear'}, {id:'log1',name:'Log (weak)'}, {id:'log2',name:'Log (strong)'}, {id:'loglog',name:'Log log'}], value:'linear'}).setClassID('mapping').setOnChanged(function() {
                    that.reDraw();
                });

                var controlsGroup = Controls.CompoundVert([
                    ctrl_Query,
                    Controls.VerticalSeparator(20),
                    that.ctrlValueXProperty,
                    Controls.VerticalSeparator(5),
                    that.ctrlValueYProperty,
                    Controls.VerticalSeparator(20),
                    binsizeGroup,
                    Controls.VerticalSeparator(20),
                    that.ctrlPalette,
                    Controls.VerticalSeparator(20),
                    that.ctrlMappingStyle
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
                that.propidValueX = that.ctrlValueXProperty.getValue();
                that.propidValueY = that.ctrlValueYProperty.getValue();
                if (that.staging)
                    return;

                that.bucketDens = null;
                if ((!that.propidValueX)||(!that.propidValueY)) {
                    that.reDraw();
                    return;
                }

                DQX.setProcessing();
                var data ={};
                data.database = MetaData.database;
                data.workspaceid = MetaData.workspaceid;
                data.tableid = that.tableInfo.id + 'CMB_' + MetaData.workspaceid;
                data.propidx = that.propidValueX;
                data.propidy = that.propidValueY;
                data.qry = SQL.WhereClause.encode(that.theQuery.get());
                if (!that.ctrl_binsizeAutomatic.getValue()) {
                    data.binsizex = that.ctrl_binsizeValueX.getValue();
                    data.binsizey = that.ctrl_binsizeValueY.getValue();
                }
                DQX.customRequest(MetaData.serverUrl,'uploadtracks','histogram2d', data, function(resp) {
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
                    var bucketsX = decoder.doDecode(resp.bucketsx);
                    var bucketsY = decoder.doDecode(resp.bucketsy);
                    var densities = decoder.doDecode(resp.densities);
                    that.bucketSizeX = resp.binsizex;
                    that.bucketSizeY = resp.binsizey;


                    var bucketXMin = Math.min.apply(Math, bucketsX);
                    var bucketXMax = Math.max.apply(Math, bucketsX);
                    var bucketYMin = Math.min.apply(Math, bucketsY);
                    var bucketYMax = Math.max.apply(Math, bucketsY);

                    that.bucketNrOffsetX = bucketXMin;
                    that.bucketCountX = bucketXMax-bucketXMin+1;
                    that.bucketNrOffsetY = bucketYMin;
                    that.bucketCountY = bucketYMax-bucketYMin+1;

                    that.bucketDens=[];
                    for (var i=0; i<that.bucketCountX; i++) {
                        var ar = [];
                        for (var j=0; j<that.bucketCountY; j++)
                            ar.push(0);
                        that.bucketDens.push(ar);
                    }
                    that.maxDens = 1;
                    for (var i=0; i<densities.length; i++) {
                        that.bucketDens[bucketsX[i]-bucketXMin][bucketsY[i]-bucketYMin] = densities[i];
                        that.maxDens = Math.max(that.maxDens,densities[i]);
                    }

                    if (that.ctrl_binsizeAutomatic.getValue()) {
                        that.ctrl_binsizeValueX.modifyValue(that.bucketSizeX);
                        that.ctrl_binsizeValueY.modifyValue(that.bucketSizeY);
                    }

                    that.panelPlot.setDirectDedraw(that.bucketCountX*that.bucketCountY<2000);
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
                if (that.panelPlot._directRedraw)
                    that.drawImpl(drawInfo);
                else
                    DQX.executeProcessing(function() { that.drawImpl(drawInfo); });
            }

            that.drawImpl = function(drawInfo) {

                that.plotPresent = false;
                var ctx = drawInfo.ctx;

                var paletteName=that.ctrlPalette.getValue();

                var marginX = 40;
                var marginY = 40;
                ctx.fillStyle="rgb(220,220,220)";
                ctx.fillRect(0,0,marginX,drawInfo.sizeY);
                ctx.fillRect(0,drawInfo.sizeY-marginY,drawInfo.sizeX,marginY);

                if (!that.bucketDens)
                    return;

                var XMin = that.bucketNrOffsetX*that.bucketSizeX;
                var XMax = (that.bucketNrOffsetX+that.bucketCountX)*that.bucketSizeX;
                var XRange = XMax - XMin;
                XMin -= 0.02*XRange;
                XMax += 0.02*XRange;
                var YMin = that.bucketNrOffsetY*that.bucketSizeY;
                var YMax = (that.bucketNrOffsetY+that.bucketCountY)*that.bucketSizeY;
                var YRange = YMax - YMin;
                YMin -= 0.02*YRange;
                YMax += 0.02*YRange;
                var scaleX = (drawInfo.sizeX-marginX) / (XMax - XMin);
                var offsetX = marginX - XMin*scaleX;
                var scaleY = - (drawInfo.sizeY-marginY) / (YMax - YMin);
                var offsetY = (drawInfo.sizeY-marginY) - YMin*scaleY;
                that.scaleX = scaleX; that.offsetX = offsetX;
                that.scaleY = scaleY; that.offsetY = offsetY;

                for (var ix=0; ix<that.bucketCountX; ix++) {
                    var x1 = (that.bucketNrOffsetX+ix+0)*that.bucketSizeX;
                    var x2 = (that.bucketNrOffsetX+ix+1)*that.bucketSizeX;
                    var px1 = Math.round(x1 * scaleX + offsetX);
                    var px2 = Math.round(x2 * scaleX + offsetX);
                    for (var iy=0; iy<that.bucketCountY; iy++) {
                        var y1 = (that.bucketNrOffsetY+iy+0)*that.bucketSizeY;
                        var y2 = (that.bucketNrOffsetY+iy+1)*that.bucketSizeY;
                        var py1 = Math.round(y1 * scaleY + offsetY);
                        var py2 = Math.round(y2 * scaleY + offsetY);
                        var fr = that.bucketDens[ix][iy]*1.0/that.maxDens;
                        if (that.ctrlMappingStyle.getValue()=='log1')
                            fr=Math.log(1+20*fr)/Math.log(21);
                        if (that.ctrlMappingStyle.getValue()=='log2')
                            fr=Math.log(1+500*fr)/Math.log(501);
                        if (that.ctrlMappingStyle.getValue()=='loglog') {
                            fr=Math.log(1+500*fr)/Math.log(501);
                            fr=Math.log(1+500*fr)/Math.log(501);
                        }
                        var cl = getPaletteColor(paletteName, fr);
                        ctx.fillStyle=cl.toString();
                        ctx.fillRect(px1,py2,px2-px1,py1-py2);
                    }
                }


                // Draw x scale
                ctx.save();
                ctx.font="10px Arial";
                ctx.fillStyle="rgb(0,0,0)";
                ctx.textAlign = 'center';
                var scale = DQX.DrawUtil.getScaleJump(30/scaleX);
                for (var i=Math.ceil(XMin/scale.Jump1); i<=Math.floor(XMax/scale.Jump1); i++) {
                    var vl = i*scale.Jump1;
                    var px = Math.round(vl * scaleX + offsetX)-0.5;
                    ctx.strokeStyle = "rgba(128,128,128,0.15)";
                    if (i%scale.JumpReduc==0)
                        ctx.strokeStyle = "rgba(0,0,0,0.25)";
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
                    ctx.strokeStyle = "rgba(128,128,128,0.15)";
                    if (i%scale.JumpReduc==0)
                        ctx.strokeStyle = "rgba(0,0,0,0.25)";
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


                that.plotPresent = true;
            };

            that.getToolTipInfo = function(px0 ,py0) {
                if (!that.plotPresent) return;
                var iX = Math.floor(((px0-that.offsetX)/that.scaleX)/that.bucketSizeX) - that.bucketNrOffsetX;
                var iY = Math.floor(((py0-that.offsetY)/that.scaleY)/that.bucketSizeY) - that.bucketNrOffsetY;
                if ( (iX>=0) && (iX<that.bucketCountX) && (iY>=0) && (iY<that.bucketCountY) && (that.bucketDens[iX][iY]>0) ) {
                    var str = '';
//                    str += that.propidx+': '+(iX+that.bucketNrOffsetX)*that.bucketSizeX+' - '+(iX+1+that.bucketNrOffsetX)*that.bucketSizeX+'<br>';
                    str += 'Count: '+that.bucketDens[iX][iY];
                    return {
                        ID: 'IDX'+iX+'_'+iY,
                        px: (iX+0.5+that.bucketNrOffsetX)*that.bucketSizeX*that.scaleX+that.offsetX,
                        py: (iY+0.5+that.bucketNrOffsetY)*that.bucketSizeY*that.scaleY+that.offsetY,
                        showPointer:true,
                        count: that.bucketDens[iX][iY],
                        minvalX: (iX+0+that.bucketNrOffsetX)*that.bucketSizeX,
                        maxvalX: (iX+1+that.bucketNrOffsetX)*that.bucketSizeX,
                        minvalY: (iY+0+that.bucketNrOffsetY)*that.bucketSizeY,
                        maxvalY: (iY+1+that.bucketNrOffsetY)*that.bucketSizeY,
                        content: str
                    };
                }
                return null;
            };


            that.onMouseClick = function(ev, info) {
                var tooltip = that.getToolTipInfo(info.x, info.y);
                if (tooltip) {

                    var qry = that.theQuery.get();
                    qry = SQL.WhereClause.createRangeRestriction(qry, that.propidValueX, tooltip.minvalX, tooltip.maxvalX);
                    qry = SQL.WhereClause.createRangeRestriction(qry, that.propidValueY, tooltip.minvalY, tooltip.maxvalY);

                    var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Show items in table",  width:120, height:30 }).setOnChanged(function() {
                        var tableView = Application.getView('table_'+that.tableInfo.id);
                        tableView.activateWithQuery(qry);
                        Popup.closeIfNeeded(popupid);
                    });
                    var content = 'X Range: '+tooltip.minvalX+' - '+tooltip.maxvalX+'<br>';
                    content += 'Y Range: '+tooltip.minvalY+' - '+tooltip.maxvalY+'<br>';
                    content += 'Number of items: '+tooltip.count;
                    content += '<br/>' + bt.renderHtml();
                    var popupid = Popup.create('Histogram bar', content);
                }
            }


            that.onSelected = function(minX, minY, maxX, maxY, shiftPressed, controlPressed, altPressed) {
                var rangeXMin = (minX-that.offsetX)/that.scaleX;
                var rangeXMax = (maxX-that.offsetX)/that.scaleX;
                var rangeYMin = (maxY-that.offsetY)/that.scaleY;
                var rangeYMax = (minY-that.offsetY)/that.scaleY;

                var qry = that.theQuery.get();
                qry = SQL.WhereClause.createRangeRestriction(qry, that.propidValueX, rangeXMin, rangeXMax);
                qry = SQL.WhereClause.createRangeRestriction(qry, that.propidValueY, rangeYMin, rangeYMax);

                var bt1 = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Show items in range in table",  width:120, height:30 }).setOnChanged(function() {
                    var tableView = Application.getView('table_'+that.tableInfo.id);
                    tableView.activateWithQuery(qry);
                    Popup.closeIfNeeded(popupid);
                });

                var bt2 = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: "Restrict plot dataset to range",  width:120, height:30 }).setOnChanged(function() {
                    that.setActiveQuery(qry);
                    Popup.closeIfNeeded(popupid);
                });

                var content = 'X Range: '+rangeXMin+' - '+rangeXMax+'<br>';
                content += 'Y Range: '+rangeYMin+' - '+rangeYMax+'<br>';
                content +=  bt1.renderHtml() + bt2.renderHtml();
                var popupid = Popup.create('2D Histogram area', content);
            }


            that.theQuery.notifyQueryUpdated = that.updateQuery;
            that.create();
            return that;
        }



        return Histogram2D;
    });


