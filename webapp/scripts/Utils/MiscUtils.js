define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/QueryTable", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/PopupFrame", "DQX/FrameCanvas", "DQX/DataFetcher/DataFetchers", "Wizards/EditQuery",
    "MetaData",
],
    function (require, Base64, Application, Framework, Controls, Msg, SQL, QueryTable, DocEl, DQX, Wizard, Popup, PopupFrame, FrameCanvas, DataFetchers, EditQuery,
              MetaData
        ) {

        var MiscUtils = {};

        //A helper function, turning a fraction into a color string
        var createFuncFraction2Color = function(minval, maxval) {
            var range = maxval-minval;
            if (!range)
                range = 1;
            return function (vl) {
                if (vl == null)
                    return "white";
                else {
                    vl=parseFloat(vl);
                    vl = (vl-minval) / range;
                    vl = Math.max(0, vl);
                    vl = Math.min(1, vl);
                    if (vl > 0) vl = 0.05 + vl * 0.95;
                    vl = Math.sqrt(vl);
                    var b = 255 ;
                    var g = 255 * (1 - 0.3*vl * vl);
                    var r = 255 * (1 - 0.6*vl);
                    return "rgb(" + parseInt(r) + "," + parseInt(g) + "," + parseInt(b) + ")";
                }
            };
        }


        MiscUtils.createItemTableViewerColumn = function(theTable, tableid, propid) {
            var tableInfo = MetaData.mapTableCatalog[tableid];
            var propInfo = MetaData.findProperty(tableid, propid);
            var encoding  = 'String';
            var tablePart = 1;
            if (propInfo.datatype=='Value') {
                encoding  = 'Float3';
                if (propInfo.settings.decimDigits ==0 )
                    encoding  = 'Int';
            }
            if ((propInfo.datatype=='Value') && (propInfo.propid=='pos') && (MetaData.getTableInfo(tableid).hasGenomePositions) )
                encoding  = 'Int';
            if (propInfo.datatype=='Boolean')
                encoding  = 'Int';
            if ( (propInfo.datatype=='GeoLongitude') || (propInfo.datatype=='GeoLattitude') )
                encoding  = 'Float4';
            if ( (propInfo.datatype=='Date') )
                encoding  = 'Float4';
            if (propInfo.isPrimKey)
                tablePart = 0;
            var sortable = (!tableInfo.hasGenomePositions) || ( (propInfo.propid!='chrom') && (propInfo.propid!='pos') );
            var col = theTable.createTableColumn(
                QueryTable.Column(propInfo.name,propInfo.propid,tablePart),
                encoding,
                sortable
            );
            if (propInfo.settings.Description)
                col.setToolTip(propInfo.settings.Description);
            if ( (tableInfo.hasGenomePositions) && (theTable.findColumn('chrom')) && (theTable.findColumn('pos')) ) {
                // Define a joint sort action on both columns chrom+pos, and set it as default
                theTable.addSortOption("Position", SQL.TableSort(['chrom', 'pos']),true);
            }

            if (propInfo.datatype=='Boolean')
                col.setDataType_MultipleChoiceInt([{id:0, name:'No'}, {id:1, name:'Yes'}]);

            if (propInfo.propid=='chrom')
                col.setDataType_MultipleChoiceString(MetaData.chromosomes);

            if (propInfo.propCategories) {
                var cats = [];
                $.each(propInfo.propCategories, function(idx, cat) {
                    cats.push({id:cat, name:cat});
                });
                col.setDataType_MultipleChoiceString(cats);
            }


            if (propInfo.isPrimKey) {
                col.setCellClickHandler(function(fetcher,downloadrownr) {
                    var itemid = theTable.getCellValue(downloadrownr,propInfo.propid);
                    Msg.send({ type: 'ItemPopup' }, { tableid: tableid, itemid: itemid } );
                })
            }

            if (propInfo.relationParentTableId) {
                col.setCellClickHandler(function(fetcher,downloadrownr) {
                    var itemid=theTable.getCellValue(downloadrownr,propInfo.propid);
                    Msg.send({ type: 'ItemPopup' }, { tableid: propInfo.relationParentTableId, itemid: itemid } );
                })
            }

            col.CellToText = propInfo.toDisplayString;
            col.CellToTextInv = propInfo.fromDisplayString;

            if ( (propInfo.isFloat) && (propInfo.settings.hasValueRange) )
                col.CellToColor = createFuncFraction2Color(propInfo.settings.minval, propInfo.settings.maxval); //Create a background color that reflects the value

            if (propInfo.isBoolean)
                col.CellToColor = function(vl) { return vl?DQX.Color(0.75,0.85,0.75):DQX.Color(1.0,0.9,0.8); }

            return col;
        }


        MiscUtils.createDataItemTable = function(frameTable, tableInfo, query, settings) {
            //Initialise the data fetcher that will download the data for the table
            var theDataFetcher = DataFetchers.Table(
                MetaData.serverUrl,
                MetaData.database,
                tableInfo.id + 'CMB_' + MetaData.workspaceid
            );

            var panelTable = QueryTable.Panel(
                frameTable,
                theDataFetcher,
                { leftfraction: 50 }
            );
            var theTable = panelTable.getTable();
            theTable.fetchBuffer = 300;
            theTable.recordCountFetchType = DataFetchers.RecordCountFetchType.DELAYED;
            theTable.setQuery(query);

            if (settings.hasSelection) {
                theTable.createSelectionColumn("sel", "", tableInfo.id, tableInfo.primkey, tableInfo, DQX.Color(1,0,0), function() {
                    Msg.broadcast({type:'SelectionUpdated'}, tableInfo.id);
                });
            }

            $.each(MetaData.customProperties, function(idx, propInfo) {
                if (propInfo.tableid == tableInfo.id)
                    if ( (propInfo.settings.showInTable) && (tableInfo.isPropertyColumnVisible(propInfo.propid)))
                    {
                        var col = MiscUtils.createItemTableViewerColumn(theTable, tableInfo.id, propInfo.propid);
                    }
            });
            panelTable.onResize();

            return panelTable;
        }



        return MiscUtils;
    });


