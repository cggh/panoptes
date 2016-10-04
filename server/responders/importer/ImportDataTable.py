# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import shutil

from os.path import join

import errno
import simplejson

from ProcessDatabase import ProcessDatabase
from BaseImport import BaseImport
from SettingsGraph import SettingsGraph
from PanoptesConfig import PanoptesConfig
from ImportSettings import valueTypes


class ImportDataTable(BaseImport):

    #Retrieve and validate settings
    def getSettings(self, tableid):
        tableSettings = self._fetchSettings(tableid)    
        
        if tableSettings['maxTableSize'] is not None:
            self._log('WARNING: table size limited to '+str(tableSettings['maxTableSize']))
                   
        return tableSettings

    def ImportDataTable(self, tableid):
        
        with self._logHeader('Importing datatable {0}'.format(tableid)):
            tableSettings = self.getSettings(tableid)
            importer = ProcessDatabase(self._calculationObject, self._datasetId, self._importSettings)
            importer.importData(tableid, createSubsets = True)
            importer.cleanUp()
            #Disabled till implemented in monet
            # filterBanker.createTableBasedSummaryValues(tableid)
            self.importGraphs(tableid)
            self.storeDataDerivedConfig(tableid)

    def storeDataDerivedConfig(self, tableId):
        with self._logHeader('Storing data derived config'):
            config = PanoptesConfig(self._calculationObject)
            baseFolder = join(config.getBaseDir(), 'config', self._datasetId, tableId)
            config = {}
            for propId in self._settingsLoader.getPropertyNames():
                config[propId] = {}
                prop = self._settingsLoader.getProperty(propId)
                if 'isCategorical' not in prop and self._dao._execSqlQuery('select count(distinct "{0}") from "{1}"'.format(propId, tableId))[0][0] < 50:
                    config[propId]['isCategorical'] = True
                if (config[propId].get('isCategorical', False) or prop.get('isCategorical', False)) \
                        and prop['dataType'] != 'Date':  #TODO Dates don't serialise nicely
                    config[propId]['distinctValues'] = map(lambda a: a[0], self._dao._execSqlQuery('select distinct "{0}" from "{1}" order by "{0}"'.format(propId, tableId)))
                if 'maxVal' not in prop and prop['dataType'] in valueTypes:
                    config[propId]['maxVal'] = self._dao._execSqlQuery('select max("{0}") from "{1}"'.format(propId, tableId))[0][0]
                if 'minVal' not in prop and prop['dataType'] in valueTypes:
                    config[propId]['minVal'] = self._dao._execSqlQuery('select min("{0}") from "{1}"'.format(propId, tableId))[0][0]
            try:
                os.makedirs(baseFolder)
            except OSError as exception:
                if exception.errno != errno.EEXIST:
                    raise
            with open(join(baseFolder, 'dataConfig.json'), 'w') as f:
                simplejson.dump(config, f)

    def importGraphs(self, tableid):
        folder = self._datatablesFolder
        with self._logHeader('Importing graphs'):
            self._dao.deleteGraphsForTable(tableid)
            graphsfolder = os.path.join(folder, tableid, 'graphs')
            if os.path.exists(graphsfolder):
                for graphid in os.listdir(graphsfolder):
                    if os.path.isdir(os.path.join(graphsfolder, graphid)):
                        print('Importing graph ' + graphid)
                        graphfolder = os.path.join(graphsfolder, graphid)
                        
                        graphSettings = SettingsGraph(os.path.join(graphfolder, 'settings'))
                       
                        self._dao.insertGraphForTable(tableid, graphid, graphSettings)
                        destFolder = os.path.join(self._config.getBaseDir(), 'Graphs', self._datasetId, tableid)
                        if not os.path.exists(destFolder):
                            os.makedirs(destFolder)
                        shutil.copyfile(os.path.join(graphfolder, 'data'), os.path.join(destFolder, graphid))

    
    def importAllDataTables(self):
        
        datatables = self._getTables()
        
        datatables = self._getDatasetFolders(datatables)

        for datatable in datatables:
            
            self.ImportDataTable(datatable)
        
        return datatable
    
    
