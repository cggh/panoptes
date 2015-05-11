# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import DQXDbTools
import DQXUtils
import config
import shutil
import SettingsLoader
from ProcessDatabase import ProcessDatabase
from ProcessFilterBank import ProcessFilterBank

from BaseImport import BaseImport


class ImportDataTable(BaseImport):
    tableOrder = 0
      
    #Retrieve and validate settings
    def getSettings(self, tableid):
        tableSettings, properties = self._fetchSettings(tableid)    
        
        tableSettings.RequireTokens(['NameSingle', 'NamePlural', 'PrimKey'])
        tableSettings.AddTokenIfMissing('IsPositionOnGenome', False)
        tableSettings.AddTokenIfMissing('IsRegionOnGenome', False)
        tableSettings.AddTokenIfMissing('MaxTableSize', None)
        tableSettings.AddTokenIfMissing('MaxCountQueryRecords', 200000)
        tableSettings.AddTokenIfMissing('MaxCountQueryAggregated', 1000000)
        tableSettings.AddTokenIfMissing('AllowSubSampling', False)

        if tableSettings['MaxTableSize'] is not None:
            self._log('WARNING: table size limited to '+str(tableSettings['MaxTableSize']))

        propDict = {}
        for prop in properties:
            propDict[prop['propid']] = prop
            

        if tableSettings['IsPositionOnGenome']:
            if tableSettings['Chromosome'] not in propDict:
                raise Exception('Genome position datatable {0} is missing property "{1}"'.format(tableid, tableSettings['Chromosome']))
            if tableSettings['Position'] not in propDict:
                raise Exception('Genome position datatable {0} is missing property "{1}"'.format(tableid, tableSettings['Position']))

        if tableSettings['IsRegionOnGenome']:
            if not tableSettings.HasToken('Chromosome'):
                raise Exception('Missing setting "Chromosome" in genome region datatable {0}'.format(tableid))
            if not tableSettings.HasToken('RegionStart'):
                raise Exception('Missing setting "RegionStart" in genome region datatable {0}'.format(tableid))
            if not tableSettings.HasToken('RegionStop'):
                raise Exception('Missing setting "RegionStop" in genome region datatable {0}'.format(tableid))
            if tableSettings['Chromosome'] not in propDict:
                raise Exception('Genome region datatable {0} is missing property "{1}"'.format(tableid, tableSettings['Chromosome']))
            if tableSettings['RegionStart'] not in propDict:
                raise Exception('Genome region datatable {0} is missing property "{1}"'.format(tableid, tableSettings['RegionStart']))
            if tableSettings['RegionStop'] not in propDict:
                raise Exception('Genome region datatable {0} is missing property "{1}"'.format(tableid, tableSettings['RegionStop']))

        if tableSettings.HasToken('TableBasedSummaryValues'):
            if not type(tableSettings['TableBasedSummaryValues']) is list:
                raise Exception('TableBasedSummaryValues token should be a list')
            for stt in tableSettings['TableBasedSummaryValues']:
                summSettings = SettingsLoader.SettingsLoader()
                summSettings.LoadDict(stt)
                summSettings.RequireTokens(['Id', 'Name', 'MaxVal', 'BlockSizeMax'])
             
        for prop in properties:
                settings = prop['Settings']
                if settings.HasToken('Relation'):
                    relationSettings = settings.GetSubSettings('Relation')
                    relationSettings.RequireTokens(['TableId'])
                    relationSettings.AddTokenIfMissing('ForwardName', 'belongs to')
                    relationSettings.AddTokenIfMissing('ReverseName', 'has')

        if tableSettings.HasToken('Description'):
            tableSettings.SetToken('Description', tableSettings['Description'].replace('\n', ' ').replace('\r', ' '))
                   
        return tableSettings, properties
                



    def ImportDataTable(self, tableid):
        
        with self._logHeader('Importing datatable {0}'.format(tableid)):

            DQXUtils.CheckValidTableIdentifier(tableid)
    
            self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'tablecatalog'))
            self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'propertycatalog'))
            self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'relations'))
            self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, 'tablebasedsummaryvalues'))
    
            tableSettings, properties = self.getSettings(tableid)
            extraSettings = tableSettings.Clone()
            extraSettings.DropTokens(['PrimKey', 'Properties'])
    
            # Drop existing tablecatalog record
            sql = "DELETE FROM tablecatalog WHERE id='{0}'".format(tableid)
            self._execSql(sql)
    
            # Add to tablecatalog
            extraSettings.ConvertStringsToSafeSQL()
            sql = "INSERT INTO tablecatalog VALUES ('{0}', '{1}', '{2}', {3}, '{4}', '{5}', {6})".format(
                tableid,
                tableSettings['NamePlural'],
                tableSettings['PrimKey'],
                tableSettings['IsPositionOnGenome'],
                extraSettings.ToJSON(),
                "", #defaultQuery
                self.tableOrder
            )
            self._execSql(sql)
            self.tableOrder += 1
    

    
            sql = "DELETE FROM propertycatalog WHERE tableid='{0}'".format(tableid)
            self._execSql(sql)
            sql = "DELETE FROM relations WHERE childtableid='{0}'".format(tableid)
            self._execSql(sql)

            properties = [prop for prop in properties if prop['Settings']['ReadData']]

            ranknr = 0
            for prop in properties:
                propid = prop['propid']
                settings = prop['Settings']
                extraSettings = settings.Clone()
                extraSettings.DropTokens(['Name', 'DataType', 'Order'])
                sql = "INSERT INTO propertycatalog VALUES ('', 'fixed', '{0}', '{1}', '{2}', '{3}', {4}, '{5}')".format(
                    settings['DataType'],
                    propid,
                    tableid,
                    settings['Name'],
                    0,
                    extraSettings.ToJSON()
                )
                self._execSql(sql)
                if settings.HasToken('Relation'):
                    relationSettings = settings.GetSubSettings('Relation')
                    self._log('Creating relation: '+relationSettings.ToJSON())
                    sql = "INSERT INTO relations VALUES ('{0}', '{1}', '{2}', '{3}', '{4}', '{5}')".format(
                        tableid,
                        propid,
                        relationSettings['TableId'],
                        '',
                        relationSettings['ForwardName'],
                        relationSettings['ReverseName']
                    )
                    self._execSql(sql)
                ranknr += 1    
 
            importer = ProcessDatabase(self._calculationObject, self._datasetId, self._importSettings, self._workspaceId)
                       
            importer.importData(tableid, createSubsets = True)
            
            filterBanker = ProcessFilterBank(self._calculationObject, self._datasetId, self._importSettings, self._workspaceId)
            filterBanker.createSummaryValues(tableid)
           
            importer.cleanUp()
    
            filterBanker.createTableBasedSummaryValues(tableid)
                
            filterBanker.printLog()
            
            self.importGraphs(tableid)

    def importGraphs(self, tableid):
        folder = self._datatablesFolder
        with self._logHeader('Importing graphs'):
            sql = "DELETE FROM graphs WHERE tableid='{0}'".format(tableid)
            self._execSql(sql)
            graphsfolder = os.path.join(folder, tableid, 'graphs')
            if os.path.exists(graphsfolder):
                for graphid in os.listdir(graphsfolder):
                    if os.path.isdir(os.path.join(graphsfolder, graphid)):
                        print('Importing graph ' + graphid)
                        graphfolder = os.path.join(graphsfolder, graphid)
                        graphSettings = SettingsLoader.SettingsLoader(os.path.join(graphfolder, 'settings'))
                        crosslink = ''
                        if graphSettings.HasToken('CrossLink'):
                            crosslink = graphSettings['CrossLink']
                        sql = "INSERT INTO graphs VALUES ('{0}', '{1}', '{2}', '{3}', '{4}', '{5}', 0)".format(
                            graphid,
                            tableid,
                            'tree',
                            graphSettings['Name'],
                            graphSettings.ToJSON(),
                            crosslink
                        )
                        self._execSql(sql)
                        destFolder = os.path.join(config.BASEDIR, 'Graphs', self._datasetId, tableid)
                        if not os.path.exists(destFolder):
                            os.makedirs(destFolder)
                        shutil.copyfile(os.path.join(graphfolder, 'data'), os.path.join(destFolder, graphid))

    
    def importAllDataTables(self):
        
        datatables = self._getTables()
        
        datatables = self._getDatasetFolders(datatables)

        for datatable in datatables:
            
            self.ImportDataTable(datatable)
        
        return datatable
    
    
