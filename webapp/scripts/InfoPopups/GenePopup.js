define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL", "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/Popup", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals", "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence","DQX/DataFetcher/DataFetchers", "DQX/DataFetcher/DataFetcherSummary", "MetaData"],
    function (require, base64, Application, Framework, Controls, Msg, SQL, DocEl, DQX, Wizard, Popup, GenomePlotter, ChannelYVals, ChannelPositions, ChannelSequence, DataFetchers, DataFetcherSummary, MetaData) {

        var GenePopup = {};

        GenePopup.init = function() {
            Msg.listen('',{type:'GenePopup'}, function(scope,geneID) {
                GenePopup.show(geneID);
            });
        }

        GenePopup.show = function(geneID) {
            var myurl = DQX.Url(MetaData.serverUrl);
            myurl.addUrlQueryItem("datatype", 'recordinfo');
            myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(SQL.WhereClause.CompareFixed('fid', '=', geneID)));
            myurl.addUrlQueryItem("database", MetaData.database);
            myurl.addUrlQueryItem("tbname", MetaData.tableAnnotation);
            $.ajax({
                url: myurl.toString(),
                success: function (resp) {
                    DQX.stopProcessing();
                    var keylist = DQX.parseResponse(resp);
                    if ("Error" in keylist) {
                        alert(keylist.Error);
                        return;
                    }
                    GenePopup.show_sub1(keylist.Data);
                },
                error: DQX.createMessageFailFunction()
            });
            DQX.setProcessing("Downloading...");
        }


        GenePopup.show_sub1 = function(data) {
            var content='';//JSON.stringify(data);
            content += '<b>Id</b>: '+data.fid+'<br/>';
            content += '<b>Name</b>: '+data.fname+'<br/>';
            content += '<b>Position</b>: '+data.chromid+':'+data.fstart+'-'+data.fstop+'<br/>';


            $.each(MetaData.tableCatalog, function(idx, table) {
                if (table.hasGenomePositions) {
                    var button_snps = Controls.Button(null, { buttonClass: 'DQXToolButton2', content: 'Show {name} in this gene'.DQXformat({name: table.name}), width:120, height:50 }).setOnChanged(function() {
                        Msg.send({type: 'ShowItemsInGenomeRange', tableid:table.id}, { preservecurrentquery:true, chrom:data.chromid, start:data.fstart, stop:data.fstop });
                        Popup.closeIfNeeded(popupid);
                    });
                    content += button_snps.renderHtml();
                }
            });


            content += '<br>';

            $.each(MetaData.externalLinks, function(idx, link) {
                if (link.linktype=='annotation_gene') {
                    var button_link = Controls.Button(null, { content: 'Find in '+link.linkname }).setOnChanged(function() {
                        window.open(link.linkurl.DQXformat({id:data.fid}), '_blank');
                    });
                    content += button_link.renderHtml();
                }
            });

            var popupid = Popup.create('Gene',content);
        }


        return GenePopup;
    });



