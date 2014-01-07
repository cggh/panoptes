define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo) {

        var ItemPopup = {};

        ItemPopup.init = function() {
            Msg.listen('',{type:'ItemPopup'}, function(scope, info) {
                ItemPopup.show(info);
            });
        }

        ItemPopup.show = function(itemInfo) {
            GetFullDataItemInfo.Get(itemInfo.tableid, itemInfo.itemid, function(resp) {
                ItemPopup.show_sub1(itemInfo, resp);
            })
        }


        ItemPopup.show_sub1 = function(itemInfo, data) {
            var content='';//JSON.stringify(data);
            var propertyMap = {};
            $.each(MetaData.customProperties, function(idx,propInfo) {
                if (propInfo.tableid == itemInfo.tableid) {
                    propertyMap[propInfo.name] = propInfo.toDisplayString(data[propInfo.propid]);
                }
            });

            function addLevelToContent(levelInfo) {
                var tableInfo = MetaData.mapTableCatalog[levelInfo.tableid];
                content += "<table>";
                $.each(MetaData.customProperties,function(idx, propInfo) {
                    if (propInfo.tableid == tableInfo.id) {
                        var fieldContent = levelInfo.fields[propInfo.propid];
                        content += '<tr>';
                        content += '<td style="padding-bottom:3px;padding-top:3px;white-space:nowrap"><b>' + propInfo.name + "</b></td>";
                        content += '<td style="padding-left:5px;word-wrap:break-word;">' + propInfo.toDisplayString(fieldContent) + "</td>";
                        content += "</tr>";
                    }
                });
                content += "</table>";
                $.each(levelInfo.parents, function(idx, parentInfo) {
                    var parentTableInfo = MetaData.mapTableCatalog[parentInfo.tableid];
                    content += '<div style="padding-left:30px">';
                    content += '<div style="color:rgb(128,0,0);background-color: rgb(240,230,220);padding:3px"><i>';
                    content += parentInfo.relation.forwardname+' '+parentTableInfo.tableNameSingle;
                    content += '</i></div>';
                    addLevelToContent(parentInfo);
                    content += '</div>';
                });
            }

            addLevelToContent(data);


            var that = PopupFrame.PopupFrame('ItemPopup'+itemInfo.tableid,
                {
                    title:MetaData.getTableInfo(itemInfo.tableid).tableCapNameSingle + ' "'+itemInfo.itemid+'"',
                    blocking:false,
                    sizeX:700, sizeY:500
                }
            );
            that.itemid = itemInfo.itemid;
            that.tableInfo = MetaData.getTableInfo(itemInfo.tableid);
/*
            // Fetch all info for child-parent relations
            $.each(that.tableInfo.relationsChildOf, function(idx, relationInfo) {
                var parentValue = data[relationInfo.childpropid];
                if (!parentValue) {

                }
                else {
                    var parentTableInfo = MetaData.mapTableCatalog[relationInfo.parenttableid];
                    var myurl = DQX.Url(MetaData.serverUrl);
                    myurl.addUrlQueryItem("datatype", 'recordinfo');
                    var primkey = parentTableInfo.primkey;
                    myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(SQL.WhereClause.CompareFixed(primkey, '=', parentValue)));
                    myurl.addUrlQueryItem("database", MetaData.database);
                    myurl.addUrlQueryItem("tbname", parentTableInfo.id + 'CMB_' + MetaData.workspaceid);
                    $.ajax({
                        url: myurl.toString(),
                        success: function (resp) {
                            DQX.stopProcessing();
                            var keylist = DQX.parseResponse(resp);
                            if ("Error" in keylist) {
                                alert(keylist.Error);
                                return;
                            }
                            debugger;
                        },
                        error: DQX.createMessageFailFunction()
                    });
                    DQX.setProcessing("Downloading...");
                }
            });
*/

            that.createFrames = function() {
                that.frameRoot.makeGroupVert();
                that.frameBody = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7))
                    .setAllowScrollBars(true,true);
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 70).setFrameClassClient('DQXGrayClient');
            };

            that.createPanels = function() {
                that.frameBody.setContentHtml(content);
                that.panelButtons = Framework.Form(that.frameButtons);

                var buttons = [];

                if (that.tableInfo.hasGenomePositions) {
                    buttons.push(Controls.HorizontalSeparator(7));
                    var bt = Controls.Button(null, { content: 'Show on genome'}).setOnChanged(function() {
                        //that.close();//!!!todo: only when blocking
                        Msg.send({ type: 'JumpgenomePosition' }, {chromoID:data.chrom, position:parseInt(data.pos) });
                    })
                    buttons.push(bt)
                }

                if (that.tableInfo.tableBasedSummaryValues.length>0) {
                    buttons.push(Controls.HorizontalSeparator(7));
                    var chk = Controls.Check(null, {
                            label: 'Show Genome tracks',
                            value:that.tableInfo.genomeTrackSelectionManager.isItemSelected(that.itemid)
                        }).setOnChanged(function() {
                        that.tableInfo.genomeTrackSelectionManager.selectItem(that.itemid,chk.getValue())
                    })
                    buttons.push(chk)
                }

                that.panelButtons.addControl(Controls.CompoundHor(buttons));
            }


            that.create();


        }


        return ItemPopup;
    });



