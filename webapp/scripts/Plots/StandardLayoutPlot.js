// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define([
    "require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers",
    "Wizards/EditQuery", "MetaData", "Utils/QueryTool", "Plots/GenericPlot", "Utils/ButtonChoiceBox", "Utils/MiscUtils"
],
    function (
        require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers,
        EditQuery, MetaData, QueryTool, GenericPlot, ButtonChoiceBox, MiscUtils
        ) {

        var StandardLayoutPlot = {};




        StandardLayoutPlot.Create = function(tableid, plotTypeID, settings, startQuery, querySettings, plotSettings) {

            var tableInfo = MetaData.getTableInfo(tableid);
            settings.title = tableInfo.tableCapNamePlural + ' (' + settings.title + ')';


            var that = GenericPlot.Create(tableid, plotTypeID, settings, startQuery, querySettings, plotSettings);


            var eventid = DQX.getNextUniqueID();that.eventids.push(eventid);
            Msg.listen(eventid,{ type: 'SelectionUpdated'}, function(scope,tableid) {
                if (that.tableInfo.id==tableid)
                    that.reDraw();
            } );


            that.createFrames = function() {
                var controlsCollapsed = false;
                if (plotSettings && plotSettings.controlsCollapsed)
                    controlsCollapsed = true;
                that.frameButtons = Framework.FrameFinal('', 0.3)
                    .setAllowScrollBars(false,true).setFixedSize(Framework.dimX,240);
                var frameRight = Framework.FrameGroupVert('', 0.7)
                    .setMargins(0).setSeparatorSize(0);
                that.frameRoot.MakeControlsFrame(that.frameButtons, frameRight, 240, controlsCollapsed);


                that.frameWarning = frameRight.addMemberFrame(Framework.FrameFinal('', 0.01))
                    .setMargins(0).setAutoSize().setAllowScrollBars(false, false);

                settings.scrollHorizontal = !!(settings.scrollHorizontal);
                settings.scrollVertical = !!(settings.scrollVertical);
                that.framePlot = frameRight.addMemberFrame(Framework.FrameFinal('', 0.99))
                    .setAllowScrollBars(settings.scrollHorizontal, settings.scrollVertical);
            };

            that.createPanels = function() {
                that.panelPlot = FrameCanvas(that.framePlot);

                that.panelButtons = Framework.Form(that.frameButtons).setPadding(0);

                that.createPanelPlot();
                that.createPanelButtons();


                this.panelWarning = Framework.Form(this.frameWarning);
                this.warningContent = Controls.Html('', '', '____');
                this.panelWarning.addControl(this.warningContent);
                this.panelWarning.render();

            };



            that.setWarning = function(warning) {
                if (warning)
                    that.warningContent.modifyValue('<div style="color:red;padding:2px;background-color:yellow;border-bottom: 1px solid black">' + warning + '</div>');
                else
                    that.warningContent.modifyValue('');
                that.panelWarning.render();
            };

            that.setAssistText = function(info) {
                var divid = that.panelPlot.getDivID();
                $('#'+divid).find('#dqxassisttext').remove();
                if (info) {
                    var str = '<div id="dqxassisttext" style="position:absolute;z-index: 999;top:0;padding:1px;color:#cf0000;background-color:rgba(255,255,0,0.5);width:100%"><b>'+info+'</b></div>';
                    $('#'+divid).append(str);
                }
            };


            return that;
        }



        return StandardLayoutPlot;
    });


