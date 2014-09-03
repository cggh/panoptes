// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils", "InfoPopups/ItemGenomeTracksPopup",
    "InfoPopups/DataItemViews/DefaultView", "InfoPopups/DataItemViews/ItemMap", "InfoPopups/DataItemViews/PieChartMap", "InfoPopups/DataItemViews/FieldList", "InfoPopups/DataItemViews/PropertyGroup"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, MiscUtils, ItemGenomeTracksPopup,
              ItemView_DefaultView, ItemView_ItemMap, ItemView_PieChartMap, ItemView_FieldList, ItemView_PropertyGroup
        ) {

        var DocPopup = {};

        DocPopup.create = function(settings) {

            var that = PopupFrame.PopupFrame('DocPopup',
                {
                    title:"Documentation",
                    icon:'fa-file-text',
                    blocking:false,
                    sizeX:700, sizeY:500
                }
            );

            that.topicStack = [];
            that.topicStackPointer = -1;


            that.createFrames = function() {
                that.frameRoot.makeGroupVert();

                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setFixedSize(Framework.dimY, 40).setFrameClassClient('DQXGrayClient').setAllowScrollBars(false, false).setMargins(0);

                that.frameContent = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.7));//.setAllowScrollBars(false, false).setMargins(0);

            };

            that.createPanels = function() {
                that.panelButtons = Framework.Form(that.frameButtons);

                that.buttonWidth = 80;
                that.buttonHeight = 30;
                var buttons = [];

                that.bt_back = Controls.Button(null, { content: 'Back', buttonClass: 'PnButtonGrid', width:that.buttonWidth, height:that.buttonHeight, icon:'fa-chevron-left'}).enable(false).setOnChanged(function() {
                    if (that.topicStackPointer > 0) {
                        that.topicStackPointer--;
                        that.loadUrl(that.topicStack[that.topicStackPointer].target, that.topicStack[that.topicStackPointer].scrollPos);
                    }
                })
                buttons.push(that.bt_back);

                that.bt_forw = Controls.Button(null, { content: 'Forward', buttonClass: 'PnButtonGrid', width:that.buttonWidth, height:that.buttonHeight, icon:'fa-chevron-right'}).enable(false).setOnChanged(function() {
                    if (that.topicStackPointer < that.topicStack.length - 1) {
                        that.topicStackPointer++;
                        that.loadUrl(that.topicStack[that.topicStackPointer].target, that.topicStack[that.topicStackPointer].scrollPos);
                    }
                })
                buttons.push(that.bt_forw);

                that.panelButtons.addControl(Controls.CompoundHor(buttons));


            };

            that.navigateUrl = function(target) {

                if (that.topicStackPointer >= 0)
                    that.topicStack[that.topicStackPointer].scrollPos = $('#'+that.frameContent.getClientDivID()).scrollTop();
                that.topicStack = that.topicStack.slice(0, that.topicStackPointer + 1);
                that.topicStack.push({ target: target, scrollPos: 0 });
                that.topicStackPointer = that.topicStack.length - 1;
                that.loadUrl(target, 0);
            };


            that.loadUrl = function(target, scrollPos) {

                that.bt_back.enable(that.topicStackPointer > 0);
                that.bt_forw.enable(that.topicStackPointer < that.topicStack.length - 1);

                var url = "Docs/{datasetid}/{target}".DQXformat({datasetid: MetaData.database, target: target});
                DQX.setProcessing();
                $.get(url, {})
                    .done(function (data) {
                        DQX.stopProcessing();
                        that.loadUrl_part2(data, scrollPos);
                    })
                    .fail(function () {
                        DQX.stopProcessing();
                        that.loadUrl_part2('<body><div style="padding:15px;color:red; font-size:16px">Failed to download documentation item:<br/><b>{target}</b></div></body>'.DQXformat({target: target}), scrollPos);
                    });
            }

            that.loadUrl_part2 = function(data, scrollPos) {

                //Get body of document
                var docParser = new DOMParser();
                var content = '';
                try {
                    var xmlDoc = docParser.parseFromString(data, "text/xml");
                    //var title = xmlDoc.getElementsByTagName("title")[0].childNodes[0].nodeValue;
                    var bd = xmlDoc.getElementsByTagName("body");
                    $.each(bd, function(idx, el) {
                        content += el.innerHTML;
                    });
                } catch (e) {
                    DQX.reportError('Unable to fetch document content:\n\n' + e);
                }

                //Replace bitmaps
                var dv = $('<div/>');
                dv.append(content);
                dv.find('img').map(function() {
                    $(this).attr('src','Doc/'+$(this).attr('src'));
                });
//                //Replace hyperlinks
//                dv.find('a').map(function() {
//                    var orighref = $(this).attr('href');
//                    //$(this).attr('href','http://localhost:63342/panoptes/webapp/Doc/'+);
//                    //$(this).replaceWith('<b>'+$(this).text()+'</b>('+orighref+')');
//                });
                content = dv.html();
                that.frameContent.setContentHtml('<div style="padding:5px">'+content+'</div>');
                $('#'+that.frameContent.getClientDivID()).scrollTop(scrollPos);
                $('#'+that.frameContent.getClientDivID()).find('a').click(function(){
                    var orighref = $(this).attr('href');
                    if ( (orighref.indexOf('http')==0) || (orighref.indexOf('mailto')==0) ) {
                        //external reference
                        window.open(orighref, '_blank');
                    }
                    else {
                        //internal doc reference
                        that.navigateUrl(orighref);
                    }
                    return false;
                });

            }


            that.create();
            that.frameContent.setContentHtml('<div style="padding:20px"><i>Loading...</i></div>');
            that.navigateUrl(settings.target + '.html');


        }


        Msg.listen('',{ type: 'OpenDoc'}, function(scope, settings) {
            DocPopup.create(settings);
        } );


        return DocPopup;
    });



