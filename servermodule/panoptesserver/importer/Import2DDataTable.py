# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>


import os
import DQXDbTools
import DQXUtils
import h5py
import ImpUtils
import copy
import arraybuffer
import customresponders.panoptesserver.Utils as Utils
from BaseImport import BaseImport
from Settings2Dtable import Settings2Dtable

class Import2DDataTable(BaseImport):

    property_order = 0
    tableOrder = 0
       
    def _hdf5_copy(self, src, dest, func = None, limit=None):
            #Process in chunk sized (at least on the primary dimension) pieces
            try:
                step_size = src.chunks[0]
                print 'oldchunk:', src.chunks
                print 'newchunk:', dest.chunks
            except TypeError:
                step_size = 10000
            shape = src.shape
            if func:
                for start in xrange(0, limit[0] or len(src), step_size):
                    end = min(start + step_size, limit[0] or len(src))
                    if len(shape) == 3:
                        dest[start:end, :limit[1], :] = func(src[start:end, :limit[1], :])
                    elif len(shape) == 2:
                        dest[start:end, :limit[1]] = func(src[start:end, :limit[1]])
                    elif len(shape) == 1:
                        dest[start:end] = func(src[start:end])
                    else:
                        raise ValueError("shape", shape, "not of dimension 1, 2 or 3")
            else:
                for start in xrange(0, limit[0] or len(src), step_size):
                    end = min(start + step_size, limit[0] or len(src))
                    if len(shape) == 3:
                        dest[start:end, :limit[1], :] = src[start:end, :limit[1], :]
                    elif len(shape) == 2:
                        dest[start:end, :] = src[start:end, :]
                    elif len(shape) == 1:
                        dest[start:end] = src[start:end]
                    else:
                        raise ValueError("shape", shape, "not of dimension 1, 2 or 3")
                        
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
            self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, '2D_tablecatalog'))
            self._calculationObject.credentialInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(self._datasetId, '2D_propertycatalog'))
            
            max_line_count = None
            if self._maxLineCount > 0:
                max_line_count = self._maxLineCount
                
            table_settings = self.getSettings(tableid)
 
            
    
            settingsFile, dataFile = self._getDataFiles(tableid)
            remote_hdf5 = h5py.File(dataFile, 'r')
            #Check that the referenced tables exist and have the primary key specified.
            if table_settings['columnDataTable']:
                tables = self._dao.getTablesInfo(table_settings['columnDataTable'])
                cat_id = tables[0]["id"]
                self._dao.checkForColumn(table_settings['columnDataTable'], table_settings['columnIndexField'])
            if table_settings['rowDataTable']:
                tables = self._dao.getTablesInfo(table_settings['rowDataTable'])
                cat_id = tables[0]["id"]

                self._dao.checkForColumn(table_settings['rowDataTable'], table_settings['rowIndexField'])
    
            if table_settings['showInGenomeBrowser']:
                sql = "SELECT IsPositionOnGenome FROM tablecatalog WHERE id='{0}' ".format(table_settings['columnDataTable'])
                is_position = self._dao._execSqlQuery(sql)[0][0]
                if not is_position:
                    raise Exception(table_settings['columnDataTable'] + ' is not a genomic position based table (IsPositionOnGenome in config), but you have asked to use this table as a column index on a genome browseable 2D array.')

            # Add to tablecatalog
            sql = "INSERT INTO 2D_tablecatalog VALUES ('{0}', '{1}', '{2}', '{3}', '{4}', '{5}')".format(
                tableid,
                table_settings['namePlural'],
                table_settings['columnDataTable'],
                table_settings['rowDataTable'],
                table_settings.serialize(),
                self.tableOrder
            )
            self._dao._execSql(sql)
            self.tableOrder += 1
    
            for propname in table_settings.getPropertyNames():
                propid = table_settings.getPropertyValue(propname,'id')
                dtype = arraybuffer._strict_dtype_string(remote_hdf5[propid].dtype)
                arity = 1 if len(remote_hdf5[propid].shape) == 2 else remote_hdf5[propid].shape[2]
                sql = "INSERT INTO 2D_propertycatalog VALUES ('{0}', '{1}', '{2}', '{3}', '{4}', {5}, '{6}', '{7}', {8})".format(
                    propid,
                    tableid,
                    table_settings['columnDataTable'],
                    table_settings['rowDataTable'],
                    table_settings.getPropertyValue(propname,'name'),
                    self.property_order,
                    dtype,
                    table_settings.serializeProperty(propname),
                    arity
                )
                self._dao._execSql(sql)
                self.property_order += 1
    
            if not self._importSettings['ConfigOnly']:
                #Insert an index column into the index tables
                if table_settings['columnDataTable']:
                    # Assume that index field has been created on import in LoadTable - it's much faster
                    # We could just run the command and ignore the error raised if it already exists
                    # sql = "ALTER TABLE `{0}` ADD `{1}_column_index` INT DEFAULT NULL;".format(table_settings['columnDataTable'], tableid)
                    # self._execSql(sql)
                    self._dao.insert2DIndexes(remote_hdf5, "column", tableid, table_settings, max_line_count)

                if table_settings['rowDataTable']:
                    self._dao.insert2DIndexes(remote_hdf5, "row", tableid, table_settings, None)
       
                #We have the indexes - now we need a local copy of the HDF5 data for each property
                ImpUtils.mkdir(os.path.join(self._config.getBaseDir(), '2D_data'))
                path_join = os.path.join(self._config.getBaseDir(), '2D_data', self._datasetId + '_' + tableid + '.hdf5')
                try:
                    os.remove(path_join)
                except OSError:
                    pass
                if table_settings['symlinkData']:
                    print "Symlinking datasets - will only work on unix"
                    os.symlink(dataFile, path_join)
                else:
                    local_hdf5 = h5py.File(path_join, 'w', libver='latest')
                    print "Copying HDF5 datasets"
                    for prop in table_settings['properties']:
                        print "..", prop
                        prop_in = remote_hdf5[prop['id']]
                        #Make some choices assuming data is variants/samples
                        if prop_in.shape[0] > prop_in.shape[1]:
                            chunks = [min(1000, prop_in.shape[0]), min(10, prop_in.shape[1])]
                        else:
                            chunks = [min(10, prop_in.shape[0]), min(1000, prop_in.shape[1])]
                        arity = 1 if len(prop_in.shape) == 2 else prop_in.shape[2]
                        if arity > 1:
                            chunks.append(arity)
                        prop_out = local_hdf5.create_dataset(prop['id'], prop_in.shape, prop_in.dtype, chunks=tuple(chunks), maxshape=prop_in.shape, compression='gzip', fletcher32=False, shuffle=False)
                        self._hdf5_copy(prop_in, prop_out, limit=(max_line_count, None))
                        print "done"
                    print "all copies complete"
                    local_hdf5.close()
                remote_hdf5.close()
                
    def importAll2DTables(self):
       
        datatables_2D = self._getTables()
        for datatable in datatables_2D:
            self.ImportDataTable(datatable)

