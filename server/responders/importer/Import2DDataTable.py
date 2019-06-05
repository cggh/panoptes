from __future__ import print_function
from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>


import os
import DQXDbTools
import DQXUtils
import zarr
from . import ImpUtils
from .BaseImport import BaseImport
from .SettingsDataTable import SettingsDataTable

class Import2DDataTable(BaseImport):

    #Retrieve and validate settings
    def getSettings(self, tableid):
        tableSettings = self._fetchSettings(tableid)
        
        if tableSettings['showInGenomeBrowser']:
            sigb = tableSettings['showInGenomeBrowser']
            if not ('call' in sigb or 'alleleDepth' in sigb):
                raise ValueError('Genome browsable 2D table must have call or allele depth')
            
        return tableSettings
            
    def ImportDataTable(self, tableid):
        with self._calculationObject.LogHeader('Importing 2D datatable {0}'.format(tableid)):

            DQXUtils.CheckValidTableIdentifier(tableid)
            self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId))
            self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId))
            
            max_line_count = None
            if self._maxLineCount > 0:
                max_line_count = self._maxLineCount
                
            table_settings = self.getSettings(tableid)


            settingsFile, data_file, isView = self._getDataFiles(tableid)
            zarr_file = zarr.DirectoryStore(data_file)
            zarr_file = zarr.group(zarr_file)
            #Check that the referenced tables exist and have the primary key specified.

            if table_settings['columnDataTable']:
                columnTableSettings = SettingsDataTable()
                columnTableSettings.loadFile(
                    os.path.join(self._datasetFolder, 'datatables', table_settings['columnDataTable'], 'settings'))
                columnProperties = [prop['id'] for prop in columnTableSettings['properties']]
#                if table_settings['columnIndexField'] not in columnProperties:
 #                   raise Exception(table_settings['columnDataTable'] + ' does not have property ' + table_settings['columnIndexField'])
            if table_settings['rowDataTable']:
                rowTableSettings = SettingsDataTable()
                rowTableSettings.loadFile(
                    os.path.join(self._datasetFolder, 'datatables', table_settings['rowDataTable'], 'settings'))
                rowProperties = [prop['id'] for prop in rowTableSettings['properties']]
                if table_settings['rowIndexField'] not in rowProperties:
                    raise Exception(table_settings['rowDataTable'] + ' does not have property ' + table_settings['rowIndexField'])
    
            if table_settings['showInGenomeBrowser']:
                if not columnTableSettings['isPositionOnGenome']:
                    raise Exception(table_settings['columnDataTable'] + ' is not a genomic position based table (IsPositionOnGenome in config), but you have asked to use this table as a column index on a genome browseable 2D array.')

            if not self._importSettings['ConfigOnly']:
                #Insert an index column into the index tables
                if table_settings['columnDataTable']:
                    # Assume that index field has been created on import in LoadTable - it's much faster
                    # We could just run the command and ignore the error raised if it already exists
                    # sql = "ALTER TABLE `{0}` ADD `{1}_column_index` INT DEFAULT NULL;".format(table_settings['columnDataTable'], tableid)
                    # self._execSql(sql)
                    self._dao.insert2DIndexes(zarr_file, "column", tableid, table_settings,
                                              columnTableSettings['primKey'],
                                              max_line_count)

                if table_settings['rowDataTable']:
                    self._dao.insert2DIndexes(zarr_file, "row", tableid, table_settings,
                                              rowTableSettings['primKey'],
                                              None)

                ImpUtils.mkdir(os.path.join(self._config.getBaseDir(), '2D_data'))
                path_join = os.path.join(self._config.getBaseDir(), '2D_data', self._datasetId + '_' + tableid + '.zarr')
                try:
                    os.remove(path_join)
                except OSError:
                    pass
                print("Symlinking 2D data")
                os.symlink(data_file, path_join)

    def importAll2DTables(self):
       
        datatables_2D = self._getTables()
        for datatable in datatables_2D:
            self.ImportDataTable(datatable)

