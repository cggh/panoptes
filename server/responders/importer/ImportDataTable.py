from __future__ import print_function
from __future__ import print_function
from __future__ import absolute_import
from __future__ import division
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import zip
from builtins import str
from builtins import map
from past.utils import old_div
import os
import shutil

from os.path import join

import errno
import simplejson
import multiprocessing
import multiprocessing.dummy


from .ProcessDatabase import ProcessDatabase
from .BaseImport import BaseImport
from .SettingsGraph import SettingsGraph
from .PanoptesConfig import PanoptesConfig
from .ImportSettings import valueTypes
from dates import datetimeToJulianDay

pool = multiprocessing.dummy.Pool(max(int(old_div(multiprocessing.cpu_count(),2)),1))

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
            importer = ProcessDatabase(self._calculationObject, self._datasetId, self._importSettings, dao=self._dao)
            importer.importData(tableid, createSubsets = True)
            importer.cleanUp()
            #Disabled till implemented in monet
            # filterBanker.createTableBasedSummaryValues(tableid)
            self.importGraphs(tableid)
            self.storeDataDerivedConfig(tableid)

    def storeDataDerivedConfig(self, table_id):
        with self._logHeader('Storing data derived config'):
            config = PanoptesConfig(self._calculationObject)
            base_folder = join(config.getBaseDir(), 'config', '_import_' + self._datasetId, table_id)
            def getDataDerivedConfigForProp(prop_id):
                result = {}
                prop = self._settingsLoader.getProperty(prop_id)
                encode = datetimeToJulianDay if prop['dataType'] == 'Date' else lambda a: a
                if 'isCategorical' not in prop and self._dao._execSqlQuery(
                        'select count(distinct "{0}") from "{1}"'.format(prop_id, table_id))[0][0] < 50 and prop['dataType'] != 'GeoJSON':
                    result['isCategorical'] = True
                if ((result.get('isCategorical', False) or prop.get('isCategorical', False))):
                    result['distinctValues'] = [encode(a[0]) for a in self._dao._execSqlQuery(
                        'select distinct "{0}" from "{1}" order by "{0}"'.format(prop_id, table_id))]
                if 'maxVal' not in prop and prop['dataType'] in valueTypes:
                    result['maxVal'] = \
                    encode(self._dao._execSqlQuery('select max("{0}") from "{1}"'.format(prop_id, table_id))[0][0])
                if 'pc90Len' not in prop and prop['dataType'] not in valueTypes:
                    # Not using for valueTypes because 0.00000001 might be reformatted (e.g. for display) as 0.00
                    result['pc90Len'] = encode(self._dao._execSqlQuery('select sys.quantile(length("{0}"),0.9) from "{1}" where "{0}" is not null'.format(prop_id, table_id))[0][0])
                if 'minVal' not in prop and prop['dataType'] in valueTypes:
                    result['minVal'] = \
                    encode(self._dao._execSqlQuery('select min("{0}") from "{1}"'.format(prop_id, table_id))[0][0])
                return result
            prop_ids = self._settingsLoader.getPropertyNames()
            results = list(map(getDataDerivedConfigForProp, prop_ids))
            data_derived_config = {}
            for prop_id, result in zip(prop_ids, results):
                data_derived_config[prop_id] = result
            try:
                os.makedirs(base_folder)
            except OSError as exception:
                if exception.errno != errno.EEXIST:
                    raise
            with open(join(base_folder, 'dataConfig.json'), 'w') as f:
                simplejson.dump(data_derived_config, f)

    def importGraphs(self, tableid):
        config = PanoptesConfig(self._calculationObject)
        folder = self._datatablesFolder
        trees = {}
        with self._logHeader('Importing graphs'):
            graphsfolder = os.path.join(folder, tableid, 'graphs')
            if os.path.exists(graphsfolder):
                for graphid in os.listdir(graphsfolder):
                    if os.path.isdir(os.path.join(graphsfolder, graphid)):
                        print('Importing graph ' + graphid)
                        graphfolder = os.path.join(graphsfolder, graphid)
                        trees[graphid] = simplejson.loads(SettingsGraph(os.path.join(graphfolder, 'settings')).serialize())
                        destFolder = os.path.join(self._config.getBaseDir(), 'Graphs', self._datasetId, tableid)
                        if not os.path.exists(destFolder):
                            os.makedirs(destFolder)
                        shutil.copyfile(os.path.join(graphfolder, 'data'), os.path.join(destFolder, graphid))
        graph_config_dir = join(config.getBaseDir(), 'config', '_import_' + self._datasetId, tableid)
        graph_config_file = join(graph_config_dir, 'graphConfig.json')
        try:
            os.remove(graph_config_file)
        except OSError:
            pass
        if len(trees) > 0:
            try:
                os.makedirs(graph_config_dir)
            except OSError as exception:
                if exception.errno != errno.EEXIST:
                    raise
            with open(graph_config_file, 'w') as f:
                print(f)
                simplejson.dump(trees, f)

    def importAllDataTables(self):
        datatables = self._getTables()
        datatables = self._getDatasetFolders(datatables)
        for datatable in datatables:
            self.ImportDataTable(datatable)
        
        return datatable
    
