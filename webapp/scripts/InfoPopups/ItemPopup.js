define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary, MetaData) {

        var ItemPopup = {};

        ItemPopup.init = function() {
            Msg.listen('',{type:'ItemPopup'}, function(scope, info) {
                ItemPopup.show(info);
            });
        }

        ItemPopup.show = function(itemInfo) {
            var myurl = DQX.Url(MetaData.serverUrl);
            myurl.addUrlQueryItem("datatype", 'recordinfo');
            var primkey = MetaData.mapTableCatalog[itemInfo.tableid].primkey;
            myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(SQL.WhereClause.CompareFixed(primkey, '=', itemInfo.itemid)));
            myurl.addUrlQueryItem("database", MetaData.database);
            myurl.addUrlQueryItem("tbname", itemInfo.tableid + 'CMB_' + MetaData.workspaceid);
            $.ajax({
                url: myurl.toString(),
                success: function (resp) {
                    DQX.stopProcessing();
                    var keylist = DQX.parseResponse(resp);
                    if ("Error" in keylist) {
                        alert(keylist.Error);
                        return;
                    }
                    ItemPopup.show_sub1(itemInfo, keylist.Data);
                },
                error: DQX.createMessageFailFunction()
            });
            DQX.setProcessing("Downloading...");
        }


        ItemPopup.show_sub1 = function(itemInfo, data) {
            var content='';//JSON.stringify(data);
            var propertyMap = {};
            $.each(MetaData.customProperties, function(idx,propInfo) {
                if (propInfo.tableid == itemInfo.tableid) {
                    propertyMap[propInfo.name] = propInfo.toDisplayString(data[propInfo.propid]);
                }
            });
            content += DQX.CreateKeyValueTable(propertyMap);

            if (('pos' in data) && ('chrom' in data)) {
                var bt = Controls.Button(null, { content: 'Show on genome'}).setOnChanged(function() {
                    Popup.closeIfNeeded(popupid);
                    Msg.send({ type: 'JumpgenomePosition' }, {chromoID:data.chrom, position:parseInt(data.pos) });
                })
                content += bt.renderHtml();
            }


            var popupid = Popup.create(MetaData.mapTableCatalog[itemInfo.tableid].name+' '+itemInfo.itemid, content);
        }


        return ItemPopup;
    });



