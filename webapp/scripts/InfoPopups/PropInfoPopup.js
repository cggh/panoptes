// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary, MetaData) {

        var PropInfoPopup = {};

        PropInfoPopup.init = function() {
            Msg.listen('',{type:'PropInfoPopup'}, function(scope, settings) {
                PropInfoPopup.show(settings);
            });
        }

        PropInfoPopup.show = function(settings) {
            var tableInfo = MetaData.mapTableCatalog[settings.tableid];
            var propInfo = MetaData.findProperty(settings.tableid, settings.propid);
            var content = '<p>';
            if (propInfo.settings.Description)
             content += '<div style="max-width: 450px">' + propInfo.settings.Description +'</div><p>';

            if (settings.buttons && settings.buttons.length>0) {
                $.each(settings.buttons, function(idx, button) {
                    var handler = button.onChanged;
                    button.setOnChanged(function() {
                        handler();
                        Popup.closeIfNeeded(popupid);
                    });
                    content += button.renderHtml();
                });
                content += '<br>';
            }

            if (!tableInfo.settings.DisablePlots) {
                var queryDefined = false;

                if (tableInfo.currentQuery)
                    if (!tableInfo.currentQuery.isTrivial)
                        queryDefined = true;


                var buttonName = 'Create plot';
                if (queryDefined)
                    buttonName += '<br>(current query)';
                var button_plot = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: buttonName, width:120, height:40, icon:'fa-bar-chart-o' }).setOnChanged(function() {
                    Msg.send({type: 'CreateDefaultPropertyPlot'}, {
                        tableid: propInfo.tableid,
                        propid: propInfo.propid,
                        query: settings.query,
                        dataValues: settings.dataValues
                    });
                    Popup.closeIfNeeded(popupid);
                });
                content += button_plot.renderHtml();

                if (queryDefined) {
                    var button_plot = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: 'Create plot<br>(all data)', width:120, height:40, icon:'fa-bar-chart-o' }).setOnChanged(function() {
                        Msg.send({type: 'CreateDefaultPropertyPlot'}, {
                            tableid: propInfo.tableid,
                            propid: propInfo.propid,
                            query: SQL.WhereClause.Trivial(),
                            dataValues: settings.dataValues
                        });
                        Popup.closeIfNeeded(popupid);
                    });
                    content += button_plot.renderHtml();
                }

            }


            var popupid = Popup.create(propInfo.name,content);
        }

        return PropInfoPopup;
    });



