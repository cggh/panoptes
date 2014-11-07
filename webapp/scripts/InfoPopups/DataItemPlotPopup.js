// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/QueryTable", "DQX/Map", "DQX/MessageBox",
    "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary",
    "MetaData", "Utils/GetFullDataItemInfo", "Utils/MiscUtils",
    "Plots/GenericPlot", "Plots/Histogram", "Plots/BarGraph"
],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, QueryTable, Map, MessageBox,
              Wizard, Popup, PopupFrame, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary,
              MetaData, GetFullDataItemInfo, MiscUtils,
              GenericPlot, Histogram, BarGraph
        ) {

        var DataItemPlotPopup = {};

        DataItemPlotPopup.promptAspects = true;

        DataItemPlotPopup.legacyPropertySelection = false;

        DataItemPlotPopup.init = function() {
            Msg.listen('', {type:'CreateDataItemPlot'}, function(scope, info) {
                DataItemPlotPopup.create(info);
            });
            Msg.listen('', {type:'CreateDefaultPropertyPlot'}, function(scope, info) {
                var query = null;
                if (info.query)
                    query = info.query;
                var propInfo = MetaData.findProperty(info.tableid, info.propid);
                if (propInfo.isFloat) {
                    Histogram.Create(propInfo.tableid, query, {
                            aspects: {'value':propInfo.propid }
                        },
                        {
                            dataValues: info.dataValues
                        });
                }
                else {
                    BarGraph.Create(propInfo.tableid, query, {
                        aspects: {'groupby':propInfo.propid }
                    });
                }

                //DataItemPlotPopup.create(info);
            });
        }

        DataItemPlotPopup.create = function(info) {
            var tableInfo = MetaData.mapTableCatalog[info.tableid];

            var content = "";

            content += '<table class="PlotTypeTable" style="max-width: 500px;padding:5px" cellspacing="0" cellpadding="0">';
            $.each(GenericPlot.getCompatiblePlotTypes(tableInfo), function(idx, plottype) {
                var id = 'PlotTypeChoice_'+plottype.typeID;
                content += '<tr id="createplot_{id}">'.DQXformat({id:id});
                content += '<td class="DQXLarge"><div style="padding:13px">' + plottype.name + '</div></td>';
                content += '<td><div style="padding:13px">' + plottype.description.DQXformat({item: tableInfo.tableNameSingle, items: tableInfo.tableNamePlural}) + "</div></td>";
                content += "</tr>";
            });
            content += '</div>';
            content += '</table>';

            var chk_promptAspects = Controls.Check(null,{ label: '<span style="color:rgb(80,80,80)"><i>Prompt for plot data before showing plot</i></span>', value: DataItemPlotPopup.promptAspects});

            content += chk_promptAspects.renderHtml();

            var popupID = Popup.create(tableInfo.tableCapNamePlural + ' plots', content);

            $.each(GenericPlot.getCompatiblePlotTypes(tableInfo), function(idx, plottype) {
                var id = 'PlotTypeChoice_'+plottype.typeID;
                $('#createplot_'+id).click(function() {
                    DataItemPlotPopup.promptAspects = chk_promptAspects.getValue();
                    Popup.closeIfNeeded(popupID);
                    if (DataItemPlotPopup.promptAspects) {
                        if (DataItemPlotPopup.legacyPropertySelection)
                            DataItemPlotPopup.createAspectSelector(plottype, info);
                        else
                            DataItemPlotPopup.createPropertySelector(plottype, info);
                    }
                    else
                        plottype.Create(tableInfo.id, info.query, {
                            subSamplingOptions: info.subSamplingOptions
                        });
                });
            });

        }

        DataItemPlotPopup.isCompatibleProperty = function(dataType, propInfo) {
            if (!dataType)
                return true;
            if (dataType==propInfo.datatype)
                return true;
            if (dataType=='Value')
                return propInfo.isFloat;
            if (dataType=='Category') {
                if (propInfo.isText) return true;
                if (propInfo.isBoolean) return true;
            }
            return false;
        }


        DataItemPlotPopup.createPropertySelector = function(plottype, info) {
            var tableInfo = MetaData.mapTableCatalog[info.tableid];

            var selectors = [];
            $.each(plottype.plotAspects, function(idx, aspectInfo) {
                var propList = [{id:'', name:''}];
                $.each(tableInfo.propertyGroups, function(idx0, groupInfo) {
                    $.each(groupInfo.properties, function(idx1, propInfo) {
                        if (DataItemPlotPopup.isCompatibleProperty(aspectInfo.dataType, propInfo)) {
                            propList.push({id: propInfo.propid, name: propInfo.name, group:propInfo.group.Name});
                        }
                    });
                } );
                var cmb = Controls.Combo(null, {label: '', states: propList, width:130});
                selectors.push({ aspectInfo:aspectInfo, ctrl:cmb, required: (aspectInfo.requiredLevel == 2)});
            });




            var content = '';
            var controls = Controls.CompoundVert([]).setMargin(0);
            content += controls.renderHtml() + '<p>';


            groupList = Controls.CompoundGrid().setSeparation(4,2);
            var rowNr = 0;
            $.each(selectors, function(idx, item) {
                groupList.setItem(rowNr, 0, Controls.Static(item.aspectInfo.name+':'));
                groupList.setItem(rowNr, 1, item.ctrl);
                groupList.setItem(rowNr, 0, Controls.Static(item.aspectInfo.name+':'));
                groupList.setItem(rowNr, 2, Controls.Static((!item.required)?'<i><span style="color:rgb(128,128,128)">(optional)</span></i>':''));
                rowNr++;
            });
            controls.addControl(groupList);

            content += controls.renderHtml();

            var buttonCreatePlot = Controls.Button(null, { content: '<b>Create plot</b>', buttonClass: 'PnButtonLarge', width:120, height:40, icon:'fa-bar-chart-o' });
            buttonCreatePlot.setOnChanged(function() {
                var aspects = {};
                $.each(selectors, function(idx, selector) {
                    if (selector.ctrl.getValue())
                        aspects[selector.aspectInfo.id] = selector.ctrl.getValue();
                });

                //Check for missing required aspects
                var missingAspects = [];
                $.each(plottype.plotAspects, function(idx, aspectInfo) {
                    if ((aspectInfo.requiredLevel == 2) && (!aspects[aspectInfo.id]) ) {
                        missingAspects.push(aspectInfo.name);
                    }
                });
                if (missingAspects.length>0) {
                    var errorText = 'Please associate the following plot aspect(s) to data properties:<br><b>'+missingAspects.join(', ')+'</b>';
                    $('#plotaspectserrorbox').html(errorText);
                    return;
                }

                Popup.closeIfNeeded(popupID);
                plottype.Create(tableInfo.id, info.query, {
                    subSamplingOptions: info.subSamplingOptions,
                    aspects: aspects
                });
            });
            content += '<p>' + buttonCreatePlot.renderHtml() + '<p>';
            content += '<div id="plotaspectserrorbox" style="color: red"></div>'
            var popupID = Popup.create(plottype.name+' aspects', content);
            controls.postCreateHtml();
        };





        //NOTE: createAspectSelector is a legacy option to associate plot aspects & dataitem properties. This has been replaced by createPropertySelector

        DataItemPlotPopup.createAspectSelector = function(plottype, info) {
            var content = '';

            var controls = Controls.CompoundVert([]).setMargin(0);

            var requiredAspects = [];
            var optionalAspects = [];
            $.each(plottype.plotAspects, function(idx, aspectInfo) {
                if (aspectInfo.requiredLevel == 2)
                    requiredAspects.push('"'+aspectInfo.name+'"');
                else
                    optionalAspects.push('"'+aspectInfo.name+'"');
            });
            var str = '<b>Select {lst}:</b>'.DQXformat({lst:requiredAspects.join(', ')});
            if (optionalAspects.length>0)
                str += '<br>(Optional: {lst})'.DQXformat({lst:optionalAspects.join(', ')});
            var headerCtrl = Controls.Html(null, str);

            var tableInfo = MetaData.mapTableCatalog[info.tableid];

            var selectors = [];
            $.each(tableInfo.propertyGroups, function(idx0, groupInfo) {
                var groupSection = null;
                var groupList = null;
                var rowNr = 0;
                $.each(groupInfo.properties, function(idx1, propInfo) {
                    var creatorFunc = null;
                    if (propInfo.settings.showInTable) {
                        states = [{id:'', name:''}];
                        $.each(plottype.plotAspects, function(idx, aspectInfo) {
                            if (DataItemPlotPopup.isCompatibleProperty(aspectInfo.dataType, propInfo))
                                states.push({id: aspectInfo.id, name: aspectInfo.name+' :' });
                        });
                        if (states.length>1) {
                            if (!groupList) {
                                groupList = Controls.CompoundGrid().setSeparation(4,0);
                                groupSection = Controls.Section(groupList, {
                                    title: groupInfo.Name,
                                    headerStyleClass: 'DQXControlSectionHeader',
                                    bodyStyleClass: 'ControlsSectionBodySubSection'
                                });
                                controls.addControl(groupSection);
                            }
                            var cmb = Controls.Combo(null, {label: '', states: states, width:130});
                            cmb.setOnChanged(function() {
                                $.each(selectors, function(idx, selector) {
                                    if (selector.propInfo.propid!=propInfo.propid) {
                                        if (selector.cmb.getValue()==cmb.getValue())
                                            selector.cmb.modifyValue('');
                                    }
                                });
                            });
                            selectors.push({ cmb: cmb, propInfo: propInfo});
                            groupList.setItem(rowNr, 0, cmb);
                            groupList.setItem(rowNr, 1, Controls.Static('<span title="{title}">{name}</span> <span style="color:rgb(170,170,170)">({datatype})</span>'.DQXformat({
                                name: propInfo.name,
                                title: propInfo.settings.Description || '',
                                datatype: propInfo.dispDataType
                            })));
                            rowNr += 1;
                        }
                    }
                })
            });

            content += headerCtrl.renderHtml() + '<br>';
            content += '<div style="background-color:white; border:1px solid rgb(100,190,200); min-width: 450px; max-height:450px; overflow-y:auto">';
            content += controls.renderHtml() + '</div><p>';
            var buttonCreatePlot = Controls.Button(null, { content: '<b>Create plot</b>', buttonClass: 'PnButtonLarge', width:120, height:40, icon:'fa-bar-chart-o' });
            buttonCreatePlot.setOnChanged(function() {
                var aspects = {};
                $.each(selectors, function(idx, selector) {
                    if (selector.cmb.getValue())
                        aspects[selector.cmb.getValue()] = selector.propInfo.propid;
                });

                //Check for missing required aspects
                var missingAspects = [];
                $.each(plottype.plotAspects, function(idx, aspectInfo) {
                    if ((aspectInfo.requiredLevel == 2) && (!aspects[aspectInfo.id]) ) {
                        missingAspects.push(aspectInfo.name);
                    }
                });
                if (missingAspects.length>0) {
                    alert('Please associate the following plot aspect(s) to data properties: \n\n'+missingAspects.join(', '));
                    return;
                }

                Popup.closeIfNeeded(popupID);
                    plottype.Create(tableInfo.id, info.query, {
                        subSamplingOptions: info.subSamplingOptions,
                        aspects: aspects
                    });
            });
            content += buttonCreatePlot.renderHtml() + '<p>';
            var popupID = Popup.create(plottype.name+' aspects', content);
            controls.postCreateHtml();
        }

        return DataItemPlotPopup;
    });



