// This file is part of Panoptes - © Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
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




        StandardLayoutPlot.Create = function(tableid, plotTypeID, settings, startQuery, querySettings) {

            var tableInfo = MetaData.getTableInfo(tableid);
            settings.title += ' (' + tableInfo.tableCapNamePlural + ')';


            var that = GenericPlot.Create(tableid, plotTypeID, settings, startQuery, querySettings);


            var eventid = DQX.getNextUniqueID();that.eventids.push(eventid);
            Msg.listen(eventid,{ type: 'SelectionUpdated'}, function(scope,tableid) {
                if (that.tableInfo.id==tableid)
                    that.reDraw();
            } );


            that.createFrames = function() {
                that.frameRoot.makeGroupHor();
                that.frameButtons = that.frameRoot.addMemberFrame(Framework.FrameFinal('', 0.3))
                    .setAllowScrollBars(false,true);

                var frameRight = that.frameRoot.addMemberFrame(Framework.FrameGroupVert('', 0.7))
                    .setMargins(0).setSeparatorSize(0);


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

            return that;
        }



        return StandardLayoutPlot;
    });


