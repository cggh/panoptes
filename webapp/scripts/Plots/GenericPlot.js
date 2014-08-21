// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
define(["require", "DQX/base64", "DQX/Application", "DQX/DataDecoders", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery", "MetaData", "Utils/QueryTool"],
    function (require, base64, Application, DataDecoders, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery, MetaData, QueryTool) {


        // Implements all the generic aspects of a plot:
        // - Popup to show it in
        // - Datatable info
        // - Active query
        // - Store & recall



        var GenericPlot = {};

        GenericPlot._registeredPlotTypes = {};
        GenericPlot.registerPlotType = function(creationObject) {
            if (!creationObject.typeID)
                DQX.reportError('Invalid plot type');
            GenericPlot._registeredPlotTypes[creationObject.typeID] = creationObject;
        }

        GenericPlot.getCompatiblePlotTypes = function(tableInfo) {
            var plottypes = [];
            $.each(GenericPlot._registeredPlotTypes, function(plottypeid, plottype) {
                if (plottype.isCompatible(tableInfo))
                    plottypes.push(plottype);
            });
            return plottypes;
        };

        GenericPlot.activePlotList = [];

        GenericPlot.Create = function(tableid, plotTypeID, settings, startQuery, querySettings) {
            settings.blocking = false;
            settings.sizeX = 700;
            settings.sizeY = 550;
            var that = PopupFrame.PopupFrame(tableid+'_'+plotTypeID, settings);
            GenericPlot.activePlotList.push(that);

            if (MetaData.isManager)
                that.addTool('fa-link', function() { that.handleCreateLink(); });

            that.plotTypeID = plotTypeID;
            that.tableInfo = MetaData.getTableInfo(tableid);
            that.eventids = [];//Add event listener id's to this list to have them removed when the popup closes

            var eventid = DQX.getNextUniqueID();that.eventids.push(eventid);
            Msg.listen(eventid, { type: 'PropertyContentChanged'}, function(scope, data) {
                if (that.tableInfo.id==data.tableid) {
                    if (that.notifyPropertyContentChanged)
                        that.notifyPropertyContentChanged(data.propid);
                }
            });

            var subSamplingOptions = null;
            if (querySettings && querySettings.subSamplingOptions) {
                subSamplingOptions = querySettings.subSamplingOptions;
            }


            that.hasProvidedAspects = function() {
                if (!querySettings)
                    return false;
                return !!querySettings.aspects;
            }

            that.providedAspect2Property = function(aspectid) {
                if (!querySettings)
                    return '';
                if (!querySettings.aspects)
                    return '';
                if (!querySettings.aspects[aspectid])
                    return '';
                return querySettings.aspects[aspectid];
            };


                that.theQuery = QueryTool.Create(tableid, {
                includeCurrentQuery:true,
                hasSubSampler:that.tableInfo.settings.AllowSubSampling,
                subSamplingOptions: subSamplingOptions
            });
            if (startQuery)
                that.theQuery.setStartQuery(startQuery);

            that.onClose = function() {
                $.each(that.eventids,function(idx,eventid) {
                    Msg.delListener(eventid);
                });
                var activeIndex = -1;
                $.each(GenericPlot.activePlotList, function(idx,plot) {
                    if (plot===that)
                        activeIndex = idx;
                });
                if (activeIndex>=0) {
                    GenericPlot.activePlotList.splice(activeIndex,1);
                }
                else
                    DQX.reportError('Plot not found!');
                if (that.onCloseCustom)
                    that.onCloseCustom();
            };

            that.plotSettingsControls = {};
            that.addPlotSettingsControl = function(id, ctrl) {
                that.plotSettingsControls[id] = ctrl;
            }



            that.store = function() {
                var obj = {};
                obj.tableid = that.tableInfo.id;
                obj.plotTypeID = that.plotTypeID;
                obj.query = that.theQuery.store();
                obj.settings = {};
                $.each(that.plotSettingsControls, function(id, ctrl) {
                    obj.settings[id] = Controls.storeSettings(ctrl);
                });
                if (that.storeCustomSettings)
                    obj.settingsCustom = that.storeCustomSettings();
                obj.controlsCollapsed = that.frameRoot.isControlsCollapsed();
                return obj;
            }

            that.recall = function(settObj) {
                if (settObj.query)
                    that.theQuery.recall(settObj.query);
                if (settObj.settings) {
                    that.staging = true;
                    $.each(that.plotSettingsControls, function(id, ctrl) {
                        if (settObj.settings[id])
                            Controls.recallSettings(ctrl, settObj.settings[id], false );
                    });
                    that.staging = false;
                }
                if (settObj.settingsCustom && that.recallCustomSettings)
                     that.recallCustomSettings(settObj.settingsCustom);
                that.reloadAll();
            }

            that.createIntroControls = function(inpExtraControls) {
                that.introText = Controls.Html(null,'', '_dummyclass_');
                that.ctrl_PointCount = Controls.Html(null, '');
                var extraControls = [that.ctrl_PointCount];
                if (inpExtraControls)
                    $.each(inpExtraControls, function(idx, ctrl) {
                        extraControls.push(ctrl);
                    });
                var ctrl_Query = that.theQuery.createQueryControl({}, extraControls);
                that.setIntroText();
                return Controls.Wrapper(Controls.CompoundVert([
                    that.introText,
                    Controls.AlignCenter(Controls.CompoundVert([
                        Controls.VerticalSeparator(10),
                        ctrl_Query
                    ]))
                ]), 'ControlsSectionBody')
            };

            that.onQueryModified = function() {
                that.setIntroText();
                if (that.updateQuery)
                    that.updateQuery();
            };


            that.setIntroText = function() {
                var content = '';
                content += that.tableInfo.createIcon({floatLeft: true});
                content += '<b>{Names}</b><br>'.DQXformat({Names: that.tableInfo.tableCapNamePlural});
                content += that.theQuery.createQueryDisplayStringHtml();
                that.introText.modifyValue(content);
            };

            that.handleCreateLink = function() {
                var content = base64.encode(JSON.stringify(that.store()));

                DQX.serverDataStore(MetaData.serverUrl, content, function (id) {
                    DQX.customRequest(MetaData.serverUrl, PnServerModule, 'view_store',
                        { database: MetaData.database, workspaceid: MetaData.workspaceid, id: id },
                        function (resp) {
                            require("Utils/IntroViews").createIntroView('plot', id, '-', 'Add plot to start page');
                        });
                });
            }

            that.theQuery.notifyQueryUpdated = that.onQueryModified;

            return that;
        }


        GenericPlot.loadStoredPlot = function(tpe, storeid) {
            DQX.serverDataFetch(MetaData.serverUrl, storeid, function(content) {
                var obj = JSON.parse(base64.decode(content));

                GenericPlot.recall([obj]);
            });
        };





        GenericPlot.store = function() {
            var obj = [];
            $.each(GenericPlot.activePlotList, function(idx,plot) {
                obj.push(plot.store());
            });
            return obj;
        }

        GenericPlot.recall = function(settObj) {
            $.each(settObj, function(idx,plotSettObj) {
                var plotGenerator = GenericPlot._registeredPlotTypes[plotSettObj.plotTypeID];
                if (!plotGenerator)
                    DQX.reportError('Unknown plot type: '+plotSettObj.plotTypeID);
                var thePlot = plotGenerator.Create(plotSettObj.tableid, null, null, plotSettObj);
                thePlot.recall(plotSettObj);
            });
        }

        Msg.listen('', { type: 'LoadStoredPlot'}, GenericPlot.loadStoredPlot);


        return GenericPlot;
    });


