define(["require", "DQX/base64", "DQX/Application", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/SQL",
  "DQX/DocEl", "DQX/Utils", "DQX/Wizard", "DQX/ChannelPlot/GenomePlotter", "DQX/ChannelPlot/ChannelYVals",
  "DQX/ChannelPlot/ChannelPositions", "DQX/ChannelPlot/ChannelSequence", "DQX/DataFetcher/DataFetchers",
  "DQX/DataFetcher/DataFetcherSummary", "Utils/QueryTool", "MetaData", "DQX/Model", "DQX/DataFetcher/DataFetcherAnnotation",
  "Views/Genotypes/GenotypeViewer"],
  function (require, base64, Application, Framework, Controls, Msg, SQL,
            DocEl, DQX, Wizard, GenomePlotter, ChannelYVals,
            ChannelPositions, ChannelSequence, DataFetchers,
            DataFetcherSummary, QueryTool, MetaData, Model, DataFetcherAnnotation,
            GenotypeViewer) {

    var Genotypes = {

      init: function () {
        // Instantiate the view object
        var that = Application.View(
          'genotypes',    // View ID
          'Genotypes'    // View title
        );
        that.setEarlyInitialisation();

        that.querySamples = QueryTool.Create('SMP', {includeCurrentQuery: true});
        that.queryVariants = QueryTool.Create('SNP', {includeCurrentQuery: true});

        that.transposeQueryResult = function(result) {
          var keys = _(result).keys();
          var len = result[keys.first()].length;
          var out = [];
          for (var i = 0; i < len; ++i) {
            var ele = {};
            keys.forEach(function(key) {
              ele[key] = result[key][i];
            });
            out.push(ele);
          }
          return out;
        };

        that.querySamples.notifyQueryUpdated = function () {

          var query = that.querySamples.get();
          var tableInfo = MetaData.getTableInfo('SMP');

          var sortColumn = query.sortColumn;
          if (!sortColumn)
            sortColumn = tableInfo.primkey;
          var maxlength = 200;
          var fetcher = DataFetchers.RecordsetFetcher(
            MetaData.serverUrl,
            MetaData.database,
            'SMP' + 'CMB_' + MetaData.workspaceid
          );
          fetcher.setMaxResultCount(maxlength);
          fetcher.addColumn(tableInfo.primkey, 'ST');
          fetcher.addColumn('country', 'ST');
          fetcher.addColumn('region', 'ST');
          fetcher.addColumn('sex', 'ST');
          fetcher.addColumn('m_s', 'ST');
          fetcher.addColumn('dna_quant_method', 'ST');
          fetcher.getData(query, sortColumn, function (data) {
              that.genotypeViewer.setSamples(that.transposeQueryResult(data), query);
            }
          );
        };

        that.queryVariants.notifyQueryUpdated = function () {
          that.genotypeViewer.setVariantQuery(that.queryVariants.get());
        };


        that.storeSettings = function () {
          var obj = {};
          obj.querySamples = that.querySamples.store();
          obj.queryVariants = that.queryVariants.store();
          return obj;
        };

        that.recallSettings = function (settObj) {
          if (settObj.querySamples)
            that.querySamples.recall(settObj.querySamples, true);
          if (settObj.queryVariants)
            that.queryVariants.recall(settObj.queryVariants, true);
        };


        //This function is called during the initialisation. Create the frame structure of the view here
        that.createFrames = function (rootFrame) {
          that.filterByQuery = false;
          rootFrame.makeGroupHor();//Declare the root frame as a horizontally divided set of subframes
          this.frameControls = rootFrame.addMemberFrame(Framework.FrameFinal('', 0.3));//Create frame that will contain the controls panel
          this.frameBrowser = rootFrame.addMemberFrame(Framework.FrameFinal('GenotypesBrowser', 0.8))
            .setMargins(0)
            .setAllowScrollBars(false, false);

        }

        //This function is called during the initialisation. Create the panels that will populate the frames here
        that.createPanels = function () {
          this.panelControls = Framework.Form(this.frameControls);
          this.panelControls.setPadding(10);

          var ctrlQuerySamples = that.querySamples.createControl();
          var ctrlQueryVariants = that.queryVariants.createControl();
          this.panelControls.addControl(Controls.CompoundVert([
            ctrlQuerySamples,
            ctrlQueryVariants
          ]));

//          var table = Controls.CompoundGrid();
//          table.setItem(0, 0, Controls.Button("SampleBrowserSelectGene", {
//              width: 80,
//              height: 31,
//              buttonClass: 'DQXToolButton1',
//              bitmap: "Bitmaps/dna3.png",
//              content: 'Go to gene' }))
//            .setOnChanged($.proxy(this.promptGene, this));
//          this.panelControls.addControl(table);
          var gv_config = Model({
            compress: false,
            cluster: false,
            tab: 'genotypes'
          });
          var table2 = Controls.CompoundGrid();
          var compress = Controls.Check('Compress', {label: 'Compress', value: false});
          compress.bindToModel(gv_config, 'compress');
          table2.setItem(0, 0, compress);
          var cluster = Controls.Check('Cluster', {label: 'Cluster', value: false});
          cluster.bindToModel(gv_config, 'cluster');
          table2.setItem(0, 2, cluster);
          this.panelControls.addControl(table2);

          var tab = Controls.Combo('TabChooser', {
            label: 'Display', states: [
              {id: 'genotypes', name: 'Genotypes'},
              {id: 'bifurcation', name: 'Bifurcation'},
              {id: 'ld', name: 'LD Plot'},
              {id: 'network', name: 'Network'}
            ],
            value: 'genotypes'
          });
          tab.bindToModel(gv_config, 'tab');
          this.panelControls.addControl(tab);

          var gv = this.genotypeViewer = GenotypeViewer(this.frameBrowser, {
              genotype:that.genotypeProvider,
              position:that.snpIndexProvider,
              annotation:that.annotationProvider},
            gv_config
          );

        };

        that.annotation_fetcher = new DataFetcherAnnotation.Fetcher({
          serverURL: serverUrl,
          database: MetaData.database,
          annotTableName: MetaData.tableAnnotation,
          chromnrfield: 'chrom'
        });

        that.annotationProvider = function (chrom, start, end, callback) {
          that.annotation_fetcher.setChromoID(chrom);
          that.annotation_fetcher._fetchRange(start, end,
            function (annotations) {
              callback(chrom, start, end, annotations);
            },
            function () {
              callback(chrom, start, end, null);
            }
          );
        };

        that.snpIndexProvider = function (query, chrom, callback) {
          if (query == undefined || query == null) {
            callback([]);
            return;
          }
          query = SQL.WhereClause.AND([query, SQL.WhereClause.CompareFixed('chrom', '=', chrom)]);
          var myurl = DQX.Url(MetaData.serverUrl);
          myurl.addUrlQueryItem("datatype", "custom");
          myurl.addUrlQueryItem("respmodule", "2d_server");
          myurl.addUrlQueryItem("respid", "dim_index");
          myurl.addUrlQueryItem('database', MetaData.database);
          myurl.addUrlQueryItem("qry", SQL.WhereClause.encode(query));
          myurl.addUrlQueryItem("tbname", 'SNP');
          var xhr = new XMLHttpRequest();
          xhr.open('GET', myurl.toString(), true);
          xhr.responseType = 'arraybuffer';
          xhr.onreadystatechange = function handler() {
            if(this.readyState == this.DONE) {
              if(this.status == 200 && this.response != null) {
                var positions = new Uint32Array(this.response);
                callback(positions);
                return;
              }
              //error
              callback(null);
            }
          };
          xhr.send();
        };

        that.genotypeProvider = function (variant_query, sample_query, chrom, start, end, callback) {
          variant_query = SQL.WhereClause.AND([variant_query,
            SQL.WhereClause.CompareFixed('chrom', '=', chrom),
            SQL.WhereClause.CompareFixed('pos', '>=', start),
            SQL.WhereClause.CompareFixed('pos', '<', end),
          ]);
          var myurl = DQX.Url(MetaData.serverUrl);
          myurl.addUrlQueryItem("datatype", "custom");
          myurl.addUrlQueryItem("respmodule", "2d_server");
          myurl.addUrlQueryItem("respid", "2d_query");
          myurl.addUrlQueryItem('database', MetaData.database);
          myurl.addUrlQueryItem("var_qry", SQL.WhereClause.encode(variant_query));
          myurl.addUrlQueryItem("samp_qry", SQL.WhereClause.encode(sample_query));
          myurl.addUrlQueryItem("var_tbname", 'SNP');
          myurl.addUrlQueryItem("samp_tbname", 'SMP' + 'CMB_' + MetaData.workspaceid);
          var xhr = new XMLHttpRequest();
          xhr.open('GET', myurl.toString(), true);
          xhr.responseType = 'arraybuffer';
          xhr.onreadystatechange = function handler() {
            if(this.readyState == this.DONE) {
              if(this.status == 200 && this.response != null) {
                callback(this.response);
                return;
              }
              //error
              callback(null);
            }
          };
          xhr.send();
        };

        return that;
      }

    };

    return Genotypes;
  });