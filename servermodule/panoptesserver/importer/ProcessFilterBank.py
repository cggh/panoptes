import os
import datetime
import SimpleFilterBankData
import MultiCategoryDensityFilterBankData
import ImpUtils
import logging
from BaseImport import BaseImport
import config
import gzip
import shutil
import SettingsLoader

#Enable with logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class ProcessFilterBank(BaseImport):

    def _getImportSetting(self, name):
        ret = None
        if name in self._importSettings:
            ret = self._importSettings[name]
        else:
            if name == 'Process':
                ret = 'all'
        return ret
    def _createSummary(self, output, chromosome, pos_str, val_str):
        pos = int(pos_str)
        val = None
        try:
            val = float(val_str)
        except:
            pass
#   print 'chrom %s, pos %d, val %s' % (chromosome, pos, val)
        if chromosome != output["currentChromosome"]:                        
            summariser = SimpleFilterBankData.Summariser(chromosome, output["propId"], output["blockSizeStart"], output["blockSizeIncrFactor"], output["blockSizeMax"], output["outputDir"], output["maxval"])
            if output["summariser"] != None:
                output["summariser"].Finalise()
            else:
                self._log(str(summariser))
            output["summariser"] = summariser
            
            output["currentChromosome"] = chromosome
        output["summariser"].Add(pos,val)

    def _createSummaryValues_Categorical(self, output, chromosome, pos_str, val_str):
        pos = int(float(pos_str))
        val = val_str
#   print 'chrom %s, pos %d, val %s' % (chromosome, pos, val)
        if chromosome != output["currentChromosome"]:
            if output["summariser"] != None:
                output["summariser"].Finalise()
            output["summariser"] = MultiCategoryDensityFilterBankData.Summariser(chromosome, output["propId"], output["blockSizeStart"], output["blockSizeIncrFactor"], output["blockSizeMax"], output["outputDir"], output["Categories"])
            output["currentChromosome"] = chromosome
        output["summariser"].Add(pos,val)        
        
        
    def _extractColumnsAndProcess(self, outputs, outputc, writeHeader, readHeader, writeColumnFiles):
        
        
        sourceFileName = None
        
        if len(outputs) == 0 and len(outputc) == 0:
#            self._log('Nothing to filter bank from {}'.format(sourceFileName))
            return
        
        for output in outputs:
            if sourceFileName == None:
                sourceFileName = output["inputFile"]
            else:
                if sourceFileName != output["inputFile"]:
                    raise ValueError("input file names do not match:", sourceFileName, " vs ", output["inputFile"])
            if writeColumnFiles and output["outputFile"] != None:
                self._log('Extracting columns {0} from {1} to {2}'.format(','.join(output["columns"]), sourceFileName, output["outputFile"]))
                #Changing the bufsiz seems to have little or no impact
                output["destFile"] = open(output["outputFile"], 'w')
                if writeHeader:
                    output["destFile"].write('\t'.join(output["columns"]) + '\n')
                
        for output in outputc:
            if sourceFileName == None:
                sourceFileName = output["inputFile"]
            else:
                if sourceFileName != output["inputFile"]:
                    raise ValueError("input file names do not match:", sourceFileName, " vs ", output["inputFile"])

            if writeColumnFiles and output["outputFile"] != None:
                self._log('Extracting columns {0} from {1} to {2}'.format(','.join(output["columns"]), sourceFileName, output["outputFile"]))
                #Changing the bufsiz seems to have little or no impact
                output["destFile"] = open(output["outputFile"], 'w')
                if writeHeader:
                    output["destFile"].write('\t'.join(output["columns"]) + '\n')
                    
        linecount = 0
        if sourceFileName.endswith('gz'):
            sourceFile = gzip.open(sourceFileName)
        else:
            sourceFile = open(sourceFileName, 'r')
            
        with self._logHeader('Creating summary values from {}'.format(sourceFileName)):
            with sourceFile:
                if readHeader:
                    header = sourceFile.readline().rstrip('\r\n').split('\t')
                    self._log('Original header: {0}'.format(','.join(header)))
                    header = [colname.replace(' ', '_') for colname in header]
                    self._log('Working Header : {0}'.format(','.join(header)))
                for output in outputs:
                    output["currentChromosome"] = ''
                    output["summariser"] = None
                    output["colindices"] = []
                    if output["columns"] != None:
                        for col in output["columns"]:
                            try:
                                output["colindices"].append(header.index(col))
                            except ValueError:
                                raise Exception('Unable to find column {0} in file {1}'.format(col, sourceFileName))
                    else:
                        #Assume Chrom Pos Value
                        output["colindices"] = [0,1,2]
                        
                for output in outputc:
                    output["currentChromosome"] = ''
                    output["colindices"] = []
                    output["summariser"] = None
                    if output["columns"] != None:
                        for col in output["columns"]:
                            try:
                                output["colindices"].append(header.index(col))
                            except ValueError:
                                raise Exception('Unable to find column {0} in file {1}'.format(col, sourceFileName))
                    else:
                        #Assume Chrom Pos Value
                        output["colindices"] = [0,1,2]
                        
                if self._importSettings['ConfigOnly']:
                    return
                
                self._log('Executing filter bank')
                       
                currentChromosome = ''
                processedChromosomes = {}
                for line in sourceFile:
                    if linecount % 50000 == 0:
                        self._log(datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S') + ' ' + str(linecount))
                    if self._maxLineCount > 0 and linecount > self._maxLineCount:
                        self._log('Processing halted at {} lines'.format(str(linecount)))
                        break
                    linecount += 1
                    line = line.rstrip('\r\n')
                    if len(line) > 0:
                        columns = line.split('\t')
                        fields = [columns[colindex] for colindex in outputs[0]["colindices"]]
                        chromosome = fields[0]
                        if chromosome != currentChromosome:
                            self._log('##### Start processing chromosome '+chromosome)
                            if chromosome in processedChromosomes:
                                raise Exception('File should be ordered by chromosome')
                            processedChromosomes[chromosome] = True
                            currentChromosome = chromosome
                        for output in outputs:
                            fields = [columns[colindex] for colindex in output["colindices"]]
                            outline = '\t'.join(fields)
                            self._createSummary(output, fields[0], fields[1], fields[2])
                            if writeColumnFiles:
                                output["destFile"].write(outline + '\n')
                        for output in outputc:
                            fields = [columns[colindex] for colindex in output["colindices"]]
                            outline = '\t'.join(fields)
                            self._createSummaryValues_Categorical(output, fields[0], fields[1], fields[2])
                            if writeColumnFiles:
                                output["destFile"].write(outline + '\n')
    
    
            self._log('Finished processing {}. {} lines'.format(sourceFileName,str(linecount)))
            for output in outputs:
                if output["summariser"] != None:
                    output["summariser"].Finalise()
                if writeColumnFiles:
                    output["destFile"].close()
            for output in outputc:
                if output["summariser"] != None:
                    output["summariser"].Finalise()
                if writeColumnFiles:
                    output["destFile"].close()


    def _replaceSummaryValuesDB(self, tableid, propid, name, summSettings, minVal):
        sourceid = 'fixed'
        workspaceid = self._workspaceId
        extraSummSettings = summSettings.Clone()
        extraSummSettings.DropTokens(['MinVal', 'MaxVal', 'BlockSizeMin', 'BlockSizeMax'])
        #Don't know why here when createSummaryValues has already deleted all
        if self._getImportSetting('Process') == 'all' or self._getImportSetting('Process') == 'db':
            stmt = "DELETE FROM summaryvalues WHERE (propid='{0}') and (tableid='{1}') and (source='{2}') and (workspaceid='{3}')"
            sql = stmt.format(propid, tableid, sourceid, workspaceid)
            self._execSql(sql)
            stmt = "INSERT INTO summaryvalues VALUES ('{0}', '{1}', '{2}', '{3}', '{4}', {5}, '{6}', {7}, {8}, {9})"
            sql = stmt.format(workspaceid,
                              sourceid,
                              propid,
                              tableid,
                              name,
                              -1,
                              extraSummSettings.ToJSON(),
                              minVal,
                              summSettings['MaxVal'],
                              summSettings['BlockSizeMin']
                              )
            self._execSql(sql)




    def _getTrackDest(self, propid):
        global config
        destFolder = os.path.join(config.BASEDIR, 'SummaryTracks', self._datasetId, propid)
        if not os.path.exists(destFolder):
            os.makedirs(destFolder)
        dataFileName = os.path.join(destFolder, propid)
        return destFolder, dataFileName
                    

    def _prepareSummaryValues(self, tableid):
        
        import DQXDbTools
        self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'summaryvalues'))

        #See also _replaceSummaryValuesDB
        if self._getImportSetting('Process') == 'all' or self._getImportSetting('Process') == 'db':
            sql = "DELETE FROM summaryvalues WHERE tableid='{0}'".format(tableid)
            self._execSql(sql)
        
        settings, sourceFileName = self._getDataFiles(tableid)
        
        self._log(("Preparing to create summary values for {} from {} using {}").format(tableid, sourceFileName, settings))
        tableSettings, properties = self._fetchSettings(tableid)

        
        outputs = []
        outputc = []
        for prop in properties:
            propid = prop['propid']
            settings = prop['Settings']
            if settings.HasToken('SummaryValues') and ImpUtils.IsValueDataTypeIdenfifier(prop['DataType']):
#                with calculationObject.LogHeader('Creating summary values for {0}.{1}'.format(tableid,propid)):
                    self._log('Creating summary values for {0}.{1}'.format(tableid,propid))
                    summSettings = settings.GetSubSettings('SummaryValues')
                    if settings.HasToken('minval'):
                        summSettings.AddTokenIfMissing('MinVal', settings['minval'])
                    summSettings.AddTokenIfMissing('MaxVal', settings['maxval'])
                    summSettings.RequireTokens(['BlockSizeMax'])
                    summSettings.AddTokenIfMissing('MinVal', 0)
                    summSettings.AddTokenIfMissing('BlockSizeMin', 1)
                    summSettings.DefineKnownTokens(['channelColor'])
    
                    self._replaceSummaryValuesDB(tableid, propid, settings['Name'], summSettings,summSettings["MinVal"])
                    destFolder, dataFileName = self._getTrackDest(propid)
                    
                    values = { 
                          'outputDir': destFolder, 
                          'outputFile' : dataFileName, 
                          'columns': [tableSettings['Chromosome'], tableSettings['Position'], propid] , 
                          'propId': propid,
                          'minval': float(summSettings["MinVal"]),
                          'maxval': float(summSettings["MaxVal"]),
                          'blockSizeIncrFactor': int(2),
                          'blockSizeStart': int(summSettings["BlockSizeMin"]),
                          'blockSizeMax': int(summSettings["BlockSizeMax"]),
                          'inputFile': sourceFileName

                          }
                    outputs.append(values)
                    
            if (settings.HasToken('SummaryValues')) and (prop['DataType'] == 'Text'):
#                with calculationObject.LogHeader('Creating categorical summary values for {0}.{1}'.format(tableid,propid)):
                    self._log('Creating categorical summary values for {0}.{1}'.format(tableid,propid))
                    summSettings = settings.GetSubSettings('SummaryValues')
                    summSettings.RequireTokens(['BlockSizeMin', 'BlockSizeMax'])
                    summSettings.AddTokenIfMissing('MaxVal', 1.0)
                    
                    destFolder, dataFileName = self._getTrackDest(propid)
                    categories = []
                    if settings.HasToken('categoryColors'):
                        stt = settings.GetSubSettings('categoryColors')
                        categories = [x for x in stt.Get()]
                        summSettings.AddTokenIfMissing('Categories', categories)
                    self._replaceSummaryValuesDB(tableid, propid, settings['Name'], summSettings,0)
                    cval = {                            
                          'outputDir': destFolder, 
                          'outputFile' : dataFileName, 
                          'columns': [tableSettings['Chromosome'], tableSettings['Position'], propid] , 
                          'propId': propid,
                          'blockSizeIncrFactor': int(2),
                          'blockSizeStart': int(summSettings["BlockSizeMin"]),
                          'blockSizeMax': int(summSettings["BlockSizeMax"]),
                          'Categories': summSettings['Categories'],
                          'inputFile': sourceFileName
                            }
                    outputc.append(cval)
            
            return outputs,outputc
        

    def createSummaryValues(self, tableid):
        if self._getImportSetting('Process') == 'all' or self._getImportSetting('Process') == 'files':
            outputs, outputc = self._prepareSummaryValues(tableid)
            self._extractColumnsAndProcess(outputs, outputc, True, True, True)
        
    def _prepareSummaryFilterBank(self, tableid, summSettings, summaryid):
        global config
        
        outputs = []
        if self._getImportSetting('ScopeStr') == 'all':
            itemtracknr = 0
            
            parentdir = os.path.join(self._datatablesFolder, tableid, summaryid)
            for fileid in os.listdir(parentdir):
                fileName = os.path.join(parentdir, fileid)
                if not (os.path.isdir(fileName)):
                    itemtracknr += 1
                    self._log('Processing {0}: {1}'.format(itemtracknr, fileid))
                    destFolder = os.path.join(config.BASEDIR, 'SummaryTracks', self._datasetId, 'TableTracks', tableid, summaryid, fileid)
                    self._log('Destination: ' + destFolder)
                    if not os.path.exists(destFolder):
                        os.makedirs(destFolder)
                    shutil.copyfile(fileName, os.path.join(destFolder, summaryid + '_' + fileid))
                    values = { 
                          'outputDir': destFolder, 
                          'outputFile' : None, 
                          'columns': None , 
                          'propId': summaryid + '_' + fileid,
                          'minval': float(summSettings["MinVal"]),
                          'maxval': float(summSettings["MaxVal"]),
                          'blockSizeIncrFactor': int(2),
                          'blockSizeStart': int(summSettings["BlockSizeMin"]),
                          'blockSizeMax': int(summSettings["BlockSizeMax"]),
                          'inputFile': fileName
                    }
                    outputs.append(values)
                    
            return outputs          
            
    def _createSummaryFilterBank(self, tableid, summSettings, summaryid):
        if self._getImportSetting('Process') == 'all' or self._getImportSetting('Process') == 'files':
            outputs = self._prepareSummaryFilterBank(tableid, summSettings, summaryid)
            for output in outputs:
                outputa = [ output ]
                self._extractColumnsAndProcess(outputa, [], False, False, False)      

    def createTableBasedSummaryValues(self, tableid):
        
        tableSettings, properties = self._fetchSettings(tableid, includeProperties = False)
        
        if self._getImportSetting('Process') == 'all' or self._getImportSetting('Process') == 'db':
            sql = "DELETE FROM tablebasedsummaryvalues WHERE tableid='{0}'".format(tableid)
            self._execSql(sql)
            
        if tableSettings.HasToken('TableBasedSummaryValues'):
            self._log('Processing table-based summary values')
            if not type(tableSettings['TableBasedSummaryValues']) is list:
                raise Exception('TableBasedSummaryValues token should be a list')
            for stt in tableSettings['TableBasedSummaryValues']:
                summSettings = SettingsLoader.SettingsLoader()
                summSettings.LoadDict(stt)
                summSettings.AddTokenIfMissing('MinVal', 0)
                summSettings.AddTokenIfMissing('BlockSizeMin', 1)
                summSettings.DefineKnownTokens(['channelColor'])
                summaryid = summSettings['Id']
                with self._logHeader('Table based summary value {0}, {1}'.format(tableid, summaryid)):
                    extraSummSettings = summSettings.Clone()
                    extraSummSettings.DropTokens(['Id', 'Name', 'MinVal', 'MaxVal', 'BlockSizeMin', 'BlockSizeMax'])
                    if self._getImportSetting('Process') == 'all' or self._getImportSetting('Process') == 'db':
                        stmt = "INSERT INTO tablebasedsummaryvalues VALUES ('{0}', '{1}', '{2}', '{3}', {4}, {5}, {6}, 0)"
                        sql = stmt.format(tableid,
                                          summaryid, 
                                          summSettings['Name'], 
                                          extraSummSettings.ToJSON(), 
                                          summSettings['MinVal'], 
                                          summSettings['MaxVal'], 
                                          summSettings['BlockSizeMin'])
                        self._execSql(sql)
                    self._createSummaryFilterBank(tableid, summSettings, summaryid)
                    
               
    #Not actually used except below
    def createAllSummaryValues(self):
        self._log('Creating summary values')
        
        datatables = self._getGlobalSettingList('DataTables')
        
        datatables = self._getDatasetFolders(datatables)
                
        for datatable in datatables:
            self.createSummaryValues(datatable)
            self.createTableBasedSummaryValues(datatable)

if __name__ == "__main__":
    
    import sys
    import customresponders.panoptesserver.asyncresponder as asyncresponder
    calc = asyncresponder.CalculationThread('', None, {'isRunningLocal': 'True'}, '')

    scopeOptions = ["all", "none", "1k", "10k", "100k"]

    processOptions = ["all", "db", "files"]
    
    if len(sys.argv) < 4:
        print('Arguments: ImportType processOptions DataSetId [...]')
        print('ImportType: '+', '.join(scopeOptions))
        print('processOptions: '+', '.join(processOptions))
        sys.exit()

    ImportMethod = sys.argv[1]
    if ImportMethod not in scopeOptions:
        print('Second argument (ImportType) has to be '+', '.join(scopeOptions))
        sys.exit()
    configOnly = (ImportMethod == 'none')

    processType = sys.argv[2]
    if processType not in processOptions:
        print('Second argument (processOptions) has to be '+', '.join(processOptions))
        sys.exit()
    

    datasetid = sys.argv[3]

    print('Start importing dataset "{0}"...'.format(datasetid))

    importSettings = {
                'ConfigOnly': configOnly,
                'ScopeStr': ImportMethod,
                'Process': processType
            }
        
    workspaceId = None
    filterBanker = ProcessFilterBank(calc, datasetid, importSettings, workspaceId) 
    filterBanker.createAllSummaryValues()
