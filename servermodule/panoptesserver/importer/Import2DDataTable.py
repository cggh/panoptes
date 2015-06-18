# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
from _mysql import OperationalError, ProgrammingError

import os
import DQXDbTools
import DQXUtils
import h5py
import simplejson
import config
import ImpUtils
import copy
import arraybuffer
import customresponders.panoptesserver.Utils as Utils
from BaseImport import BaseImport
from ImportSettings import ImportSettings

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
        tableSettings = self._fetchSettings(tableid, settingsDef = ImportSettings._2DtableSettings)
        
        if tableSettings['ShowInGenomeBrowser']:
            sigb = tableSettings['ShowInGenomeBrowser']
            if not ('Call' in sigb or 'AlleleDepth' in sigb):
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
            if table_settings['ColumnDataTable']:
                tables = self._getTablesInfo(table_settings['ColumnDataTable'])
                cat_id = tables[0]["id"]
                sql = "SELECT {0} FROM {1} LIMIT 1".format(table_settings['ColumnIndexField'],
                                                           table_settings['ColumnDataTable'])
                try:
                    idx_field = self._execSqlQuery(sql)
                except:
                    raise Exception(table_settings['ColumnIndexField'] + " column index field doesn't exist in table " + table_settings['ColumnDataTable'])
            if table_settings['RowDataTable']:
                tables = self._getTablesInfo(table_settings['RowDataTable'])
                cat_id = tables[0]["id"]

                sql = "SELECT {0} FROM {1} LIMIT 1".format(table_settings['RowIndexField'],
                                                           table_settings['RowDataTable'])
                try:
                    idx_field = self._execSqlQuery(sql)
                except:
                    raise Exception(table_settings['RowIndexField'] + " row index field doesn't exist in table " + table_settings['RowDataTable'])
    
            if table_settings['ShowInGenomeBrowser']:
                sql = "SELECT IsPositionOnGenome FROM tablecatalog WHERE id='{0}' ".format(table_settings['ColumnDataTable'])
                is_position = self._execSqlQuery(sql)[0][0]
                if not is_position:
                    raise Exception(table_settings['ColumnDataTable'] + ' is not a genomic position based table (IsPositionOnGenome in config), but you have asked to use this table as a column index on a genome browseable 2D array.')
            if table_settings['FirstArrayDimension'] not in ['column', 'row']:
                raise Exception("FirstArrayDimension must be column or row")
    
            # Add to tablecatalog
            sql = "INSERT INTO 2D_tablecatalog VALUES ('{0}', '{1}', '{2}', '{3}', '{4}', '{5}', {6})".format(
                tableid,
                table_settings['NamePlural'],
                table_settings['ColumnDataTable'],
                table_settings['RowDataTable'],
                table_settings['FirstArrayDimension'],
                table_settings.serialize(),
                self.tableOrder
            )
            self._execSql(sql)
            self.tableOrder += 1
    
            for propname in table_settings.getPropertyNames():
                propid = table_settings.getPropertyValue(propname,'Id')
                dtype = arraybuffer._strict_dtype_string(remote_hdf5[propid].dtype)
                arity = 1 if len(remote_hdf5[propid].shape) == 2 else remote_hdf5[propid].shape[2]
                sql = "INSERT INTO 2D_propertycatalog VALUES ('{0}', '{1}', '{2}', '{3}', '{4}', {5}, '{6}', '{7}', {8})".format(
                    propid,
                    tableid,
                    table_settings['ColumnDataTable'],
                    table_settings['RowDataTable'],
                    table_settings.getPropertyValue(propname,'Name'),
                    self.property_order,
                    dtype,
                    table_settings.serializeProperty(propname),
                    arity
                )
                self._execSql(sql)
                self.property_order += 1
    
            if not self._importSettings['ConfigOnly']:
                #Insert an index column into the index tables
                if table_settings['ColumnDataTable']:
                    # Assume that index field has been created on import in LoadTable - it's much faster
                    # We could just run the command and ignore the error raised if it already exists
                    # sql = "ALTER TABLE `{0}` ADD `{1}_column_index` INT DEFAULT NULL;".format(table_settings['ColumnDataTable'], tableid)
                    # self._execSql(sql)
                    if table_settings['ColumnIndexArray']:
                        #We have an array that matches to a column in the 1D SQL, we add an index to the 1D SQL
                        #Firstly create a temporary table with the index array
                        try:
                            column_index = remote_hdf5[table_settings['ColumnIndexArray']]
                        except KeyError:
                            raise Exception("HDF5 doesn't contain {0} at the root".format(table_settings['ColumnIndexArray']))
                        for prop in table_settings['Properties']:
                            if len(column_index) != remote_hdf5[prop['Id']].shape[0 if table_settings['FirstArrayDimension'] == 'column' else 1]:
                                raise Exception("Property {0} has a different column length to the column index".format(property))
                            
                        #TempColIndex should really be a TEMPORARY table
                        self._dropTable('`TempColIndex`')
                        sql = ImpUtils.Numpy_to_SQL().create_table('TempColIndex', table_settings['ColumnIndexField'], column_index[0:max_line_count])
                        ImpUtils.ExecuteSQLGenerator(self._calculationObject, self._datasetId, sql)
    
                        #Add an index to the table - catch the exception if it exists.
                        sql = "ALTER TABLE `{0}` ADD `{2}_column_index` INT DEFAULT NULL;".format(
                            table_settings['ColumnDataTable'],
                            table_settings['ColumnIndexField'],
                            tableid)
                        try:
                            self._execSql(sql)
                        except OperationalError as e:
                            if e[0] != 1060:
                                raise e
    
                        # We have a datatable - add an index to it then copy that index across to the data table
                        sql = """ALTER TABLE `TempColIndex` ADD `index` INT DEFAULT NULL;
                                 SELECT @i:=-1;UPDATE `TempColIndex` SET `index` = @i:=@i+1;
                                 UPDATE `{0}` INNER JOIN `TempColIndex` ON `{0}`.`{1}` = `TempColIndex`.`{1}` SET `{0}`.`{2}_column_index` = `TempColIndex`.`index`;
                                 """.format(
                            table_settings['ColumnDataTable'],
                            table_settings['ColumnIndexField'],
                            tableid)
                        self._execSql(sql)
                        self._dropTable('`TempColIndex`')
                        #Now check we have no NULLS
                        sql = "SELECT `{1}_column_index` from `{0}` where `{1}_column_index` IS NULL".format(
                            table_settings['ColumnDataTable'],
                            tableid)
                        nulls = self._execSqlQuery(sql)
                        if len(nulls) > 0:
                            print("WARNING:Not all rows in {0} have a corresponding column in 2D datatable {1}".format(table_settings['ColumnDataTable'], tableid))
                    else:
                        #Add an index to the table - catch the exception if it exists.
                        sql = "ALTER TABLE `{0}` ADD `{2}_column_index` INT DEFAULT NULL;".format(
                            table_settings['ColumnDataTable'],
                            table_settings['ColumnIndexField'],
                            tableid)
                        try:
                            self._execSql(sql)
                        except OperationalError as e:
                            if e[0] != 1060:
                                raise e

                        #We don't have an array of keys into a column so we are being told the data in HDF5 is in the same order as sorted "ColumnIndexField" so we index by that column in order
                        if max_line_count:
                            sql = "SELECT @i:=-1;UPDATE `{0}` SET `{2}_column_index` = @i:=@i+1 ORDER BY `{1}` LIMIT {3};"
                        else:
                            sql = "SELECT @i:=-1;UPDATE `{0}` SET `{2}_column_index` = @i:=@i+1 ORDER BY `{1}`;"

                        sql = sql.format(
                            table_settings['ColumnDataTable'],
                            table_settings['ColumnIndexField'],
                            tableid, max_line_count)
                        self._execSql(sql)
    
                if table_settings['RowDataTable']:
                    #Add an index to the table - catch the exception if it exists.
                    sql = "ALTER TABLE `{0}` ADD `{2}_row_index` INT DEFAULT NULL;".format(
                        table_settings['RowDataTable'],
                        table_settings['RowIndexField'],
                        tableid)
                    try:
                        self._execSql(sql)
                    except OperationalError as e:
                        if e[0] != 1060:
                            raise e
                                                
                    if table_settings['RowIndexArray']:
                        #We have an array that matches to a column in the 1D SQL, we add an index to the 1D SQL
                        #Firstly create a temporay table with the index array
                        try:
                            row_index = remote_hdf5[table_settings['RowIndexArray']]
                        except KeyError:
                            raise Exception("HDF5 doesn't contain {0} at the root".format(table_settings['RowIndexArray']))
                        for prop in table_settings['Properties']:
                            if len(row_index) != remote_hdf5[prop['Id']].shape[0 if table_settings['FirstArrayDimension'] == 'row' else 1]:
                                raise Exception("Property {0} has a different row length to the row index".format(property))
                        self._dropTable('`TempRowIndex`')
                        sql = ImpUtils.Numpy_to_SQL().create_table('TempRowIndex', table_settings['RowIndexField'], row_index)
                        ImpUtils.ExecuteSQLGenerator(self._calculationObject, self._datasetId, sql)

                        #We have a datatable - add an index to it then copy that index across to the data table
                        sql = """ALTER TABLE `TempRowIndex` ADD `index` INT DEFAULT NULL;
                                 SELECT @i:=-1;UPDATE `TempRowIndex` SET `index` = @i:=@i+1;
                                 UPDATE `{0}` INNER JOIN `TempRowIndex` ON `{0}`.`{1}` = `TempRowIndex`.`{1}` SET `{0}`.`{2}_row_index` = `TempRowIndex`.`index`;
                                 """.format(
                            table_settings['RowDataTable'],
                            table_settings['RowIndexField'],
                            tableid)
                        self._execSql(sql)
                        self._dropTable('`TempRowIndex`')
                        #Now check we have no NULLS
                        sql = "SELECT `{1}_row_index` from `{0}` where `{1}_row_index` IS NULL".format(
                            table_settings['RowDataTable'],
                            tableid)
                        nulls = self._execSqlQuery(sql)
                        if len(nulls) > 0:
                            print("WARNING: Not all rows in {0} have a corresponding row in 2D datatable {1}".format(table_settings['RowDataTable'], tableid))
                    else:
                        
                        #We don't have an array of keys into a column so we are being told the data in HDF5 is in the same order as sorted "RowIndexField" so we index by that column in order
                        sql = """SELECT @i:=-1;UPDATE `{0}` SET `{2}_row_index` = @i:=@i+1 ORDER BY `{1}`;
                                 """.format(
                            table_settings['RowDataTable'],
                            table_settings['RowIndexField'],
                            tableid)
                        self._execSql(sql)
    
    
                #We have the indexes - now we need a local copy of the HDF5 data for each property
                ImpUtils.mkdir(os.path.join(config.BASEDIR, '2D_data'))
                path_join = os.path.join(config.BASEDIR, '2D_data', self._datasetId + '_' + tableid + '.hdf5')
                try:
                    os.remove(path_join)
                except OSError:
                    pass
                if table_settings['SymlinkData']:
                    print "Symlinking datasets - will only work on unix"
                    os.symlink(dataFile, path_join)
                else:
                    local_hdf5 = h5py.File(path_join, 'w', libver='latest')
                    print "Copying HDF5 datasets"
                    for prop in table_settings['Properties']:
                        print "..", prop
                        prop_in = remote_hdf5[prop['Id']]
                        #Make some choices assuming data is variants/samples
                        if prop_in.shape[0] > prop_in.shape[1]:
                            chunks = [min(1000, prop_in.shape[0]), min(10, prop_in.shape[1])]
                        else:
                            chunks = [min(10, prop_in.shape[0]), min(1000, prop_in.shape[1])]
                        arity = 1 if len(prop_in.shape) == 2 else prop_in.shape[2]
                        if arity > 1:
                            chunks.append(arity)
                        prop_out = local_hdf5.create_dataset(prop['Id'], prop_in.shape, prop_in.dtype, chunks=tuple(chunks), maxshape=prop_in.shape, compression='gzip', fletcher32=False, shuffle=False)
                        self._hdf5_copy(prop_in, prop_out, limit=(None, max_line_count) if table_settings['FirstArrayDimension'] == 'row' else (max_line_count, None))
                        print "done"
                    print "all copies complete"
                    local_hdf5.close()
                remote_hdf5.close()
                
    def importAll2DTables(self):
       
        datatables_2D = self._getTables()
        for datatable in datatables_2D:
            self.ImportDataTable(datatable)

