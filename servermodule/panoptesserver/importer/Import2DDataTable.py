# This file is part of Panoptes - © Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import DQXDbTools
import DQXUtils
import h5py
import simplejson
import config
import SettingsLoader
import ImpUtils
import copy
import arraybuffer
import customresponders.panoptesserver.Utils as Utils


tableOrder = 0
property_order = 0

def ImportDataTable(calculation_object, dataset_id, tableid, folder, import_settings):
    global tableOrder, property_order
    with calculation_object.LogHeader('Importing 2D datatable {0}'.format(tableid)):
        print('Source: ' + folder)
        DQXUtils.CheckValidIdentifier(tableid)

        table_settings = SettingsLoader.SettingsLoader(os.path.join(os.path.join(folder, 'settings')))
        table_settings.RequireTokens(['NameSingle', 'NamePlural', 'FirstArrayDimension'])
        table_settings.AddTokenIfMissing('ShowInGenomeBrowser', False)
        table_settings.AddTokenIfMissing('ColumnDataTable', '')
        table_settings.AddTokenIfMissing('RowDataTable', '')
        extra_settings = table_settings.Clone()
        extra_settings.DropTokens(['ColumnDataTable',
                                  'ColumnIndexField',
                                  'RowDataTable',
                                  'RowIndexField',
                                  'Properties'])

        remote_hdf5 = h5py.File(os.path.join(folder, 'data.hdf5'), 'r')
        #Check that the referenced tables exist and have the primary key specified.
        if table_settings['ColumnDataTable']:
            sql = "SELECT id FROM tablecatalog WHERE id = '{0}'".format(table_settings['ColumnDataTable'])
            id = ImpUtils.ExecuteSQLQuery(calculation_object, dataset_id, sql)
            try:
                id = id[0][0]
            except IndexError:
                raise Exception("Index Table " + table_settings['ColumnDataTable'] + " doesn't exist")
            sql = "SELECT {0} FROM {1} LIMIT 1".format(table_settings['ColumnIndexField'],
                                                       table_settings['ColumnDataTable'])
            try:
                field = ImpUtils.ExecuteSQLQuery(calculation_object, dataset_id, sql)
            except:
                raise Exception(table_settings['ColumnIndexField'] + " column index field doesn't exist in table " + table_settings['ColumnDataTable'])
        if table_settings['RowDataTable']:
            sql = "SELECT id FROM tablecatalog WHERE id = '{0}'".format(table_settings['RowDataTable'])
            id = ImpUtils.ExecuteSQLQuery(calculation_object, dataset_id, sql)
            try:
                id = id[0][0]
            except IndexError:
                raise Exception("Index Table " + table_settings['RowDataTable'] + " doesn't exist")
            sql = "SELECT {0} FROM {1} LIMIT 1".format(table_settings['RowIndexField'],
                                                       table_settings['RowDataTable'])
            try:
                field = ImpUtils.ExecuteSQLQuery(calculation_object, dataset_id, sql)
            except:
                raise Exception(table_settings['RowIndexField'] + " row index field doesn't exist in table " + table_settings['RowDataTable'])

        if table_settings['ShowInGenomeBrowser']:
            sql = "SELECT IsPositionOnGenome FROM tablecatalog WHERE id='{0}' ".format(table_settings['ColumnDataTable'])
            is_position = ImpUtils.ExecuteSQLQuery(calculation_object, dataset_id, sql)[0][0]
            if not is_position:
                raise Exception(table_settings['ColumnDataTable'] + ' is not a genomic position based table (IsPositionOnGenome in config), but you have asked to use this table as a column index on a genome browseable 2D array.')
        if table_settings['FirstArrayDimension'] not in ['column', 'row']:
            raise Exception("FirstArrayDimension must be column or row")

        # Add to tablecatalog
        extra_settings.ConvertStringsToSafeSQL()
        sql = "INSERT INTO 2D_tablecatalog VALUES ('{0}', '{1}', '{2}', '{3}', '{4}', '{5}', {6})".format(
            tableid,
            table_settings['NamePlural'],
            table_settings['ColumnDataTable'],
            table_settings['RowDataTable'],
            table_settings['FirstArrayDimension'],
            extra_settings.ToJSON(),
            tableOrder
        )
        ImpUtils.ExecuteSQL(calculation_object, dataset_id, sql)
        tableOrder += 1

        for property in table_settings['Properties']:
            extra_settings = copy.deepcopy(property)
            dtype = arraybuffer._strict_dtype_string(remote_hdf5[property['Id']].dtype)
            del extra_settings['Id']
            del extra_settings['Name']
            sql = "INSERT INTO 2D_propertycatalog VALUES ('{0}', '{1}', '{2}', '{3}', '{4}', {5}, '{6}', '{7}')".format(
                property['Id'],
                tableid,
                table_settings['ColumnDataTable'],
                table_settings['RowDataTable'],
                property['Name'],
                property_order,
                dtype,
                simplejson.dumps(extra_settings)
            )
            ImpUtils.ExecuteSQL(calculation_object, dataset_id, sql)
            property_order += 1

        if not import_settings['ConfigOnly']:
            #Insert an index column into the index tables
            if table_settings['ColumnDataTable']:
                if table_settings.HasToken('ColumnIndexArray'):
                    #We have an array that matches to a column in the 1D SQL, we add an index to the 1D SQL
                    #Firstly create a temporay table with the index array
                    try:
                        column_index = remote_hdf5[table_settings['ColumnIndexArray']]
                    except KeyError:
                        raise Exception("HDF5 doesn't contain {0} at the root".format(table_settings['ColumnIndexArray']))
                    for property in table_settings['Properties']:
                        if len(column_index) != remote_hdf5[property['Id']].shape[0 if table_settings['FirstArrayDimension'] == 'column' else 1]:
                            raise Exception("Property {0} has a different column length to the column index".format(property))
                    sql = ImpUtils.Numpy_to_SQL().create_table('TempColIndex', table_settings['ColumnIndexField'], column_index)
                    ImpUtils.ExecuteSQLGenerator(calculation_object, dataset_id, sql)

                    #We have a datatable - add an index to it then copy that index across to the data table
                    sql = """ALTER TABLE `TempColIndex` ADD `index` INT DEFAULT NULL;
                             SELECT @i:=-1;UPDATE `TempColIndex` SET `index` = @i:=@i+1;
                             ALTER TABLE `{0}` ADD `{2}_column_index` INT DEFAULT NULL;
                             UPDATE `{0}` INNER JOIN `TempColIndex` ON `{0}`.`{1}` = `TempColIndex`.`{1}` SET `{0}`.`{2}_column_index` = `TempColIndex`.`index`;
                             DROP TABLE `TempColIndex`""".format(
                        table_settings['ColumnDataTable'],
                        table_settings['ColumnIndexField'],
                        tableid)
                    ImpUtils.ExecuteSQL(calculation_object, dataset_id, sql)
                    #Now check we have no NULLS
                    sql = "SELECT `{1}_column_index` from `{0}` where `{1}_column_index` IS NULL".format(
                        table_settings['ColumnDataTable'],
                        tableid)
                    nulls = ImpUtils.ExecuteSQLQuery(calculation_object, dataset_id, sql)
                    if len(nulls) > 0:
                        raise Exception("Not all rows in {0} have a corresponding column in 2D datatable {1}".format(table_settings['ColumnDataTable'], tableid))
                else:
                    #We don't have an array of keys into a column so we are being told the data in HDF5 is in the same order as sorted "ColumnIndexField" so we index by that column in order
                    sql = """ALTER TABLE `{0}` ADD `{2}_column_index` INT DEFAULT NULL;
                             SELECT @i:=-1;UPDATE `{0}` SET `{2}_column_index` = @i:=@i+1 ORDER BY `{1}`;
                             """.format(
                        table_settings['ColumnDataTable'],
                        table_settings['ColumnIndexField'],
                        tableid)
                    ImpUtils.ExecuteSQL(calculation_object, dataset_id, sql)

            if table_settings['RowDataTable']:
                if table_settings.HasToken('RowIndexArray'):
                    #We have an array that matches to a column in the 1D SQL, we add an index to the 1D SQL
                    #Firstly create a temporay table with the index array
                    try:
                        row_index = remote_hdf5[table_settings['RowIndexArray']]
                    except KeyError:
                        raise Exception("HDF5 doesn't contain {0} at the root".format(table_settings['RowIndexArray']))
                    for property in table_settings['Properties']:
                        if len(row_index) != remote_hdf5[property['Id']].shape[0 if table_settings['FirstArrayDimension'] == 'row' else 1]:
                            raise Exception("Property {0} has a different row length to the row index".format(property))
                    sql = ImpUtils.Numpy_to_SQL().create_table('TempRowIndex', table_settings['RowIndexField'], row_index)
                    ImpUtils.ExecuteSQLGenerator(calculation_object, dataset_id, sql)

                    #We have a datatable - add an index to it then copy that index across to the data table
                    sql = """ALTER TABLE `TempRowIndex` ADD `index` INT DEFAULT NULL;
                             SELECT @i:=-1;UPDATE `TempRowIndex` SET `index` = @i:=@i+1;
                             ALTER TABLE `{0}` ADD `{2}_row_index` INT DEFAULT NULL;
                             UPDATE `{0}` INNER JOIN `TempRowIndex` ON `{0}`.`{1}` = `TempRowIndex`.`{1}` SET `{0}`.`{2}_row_index` = `TempRowIndex`.`index`;
                             DROP TABLE `TempRowIndex`""".format(
                        table_settings['RowDataTable'],
                        table_settings['RowIndexField'],
                        tableid)
                    ImpUtils.ExecuteSQL(calculation_object, dataset_id, sql)
                    #Now check we have no NULLS
                    sql = "SELECT `{1}_row_index` from `{0}` where `{1}_row_index` IS NULL".format(
                        table_settings['RowDataTable'],
                        tableid)
                    nulls = ImpUtils.ExecuteSQLQuery(calculation_object, dataset_id, sql)
                    if len(nulls) > 0:
                        raise Exception("Not all rows in {0} have a corresponding row in 2D datatable {1}".format(table_settings['RowDataTable'], tableid))
                else:
                    #We don't have an array of keys into a column so we are being told the data in HDF5 is in the same order as sorted "RowIndexField" so we index by that column in order
                    sql = """ALTER TABLE `{0}` ADD `{2}_row_index` INT DEFAULT NULL;
                             SELECT @i:=-1;UPDATE `{0}` SET `{2}_row_index` = @i:=@i+1 ORDER BY `{1}`;
                             """.format(
                        table_settings['RowDataTable'],
                        table_settings['RowIndexField'],
                        tableid)
                    ImpUtils.ExecuteSQL(calculation_object, dataset_id, sql)


            #We have the indexes - now we need a local copy of the HDF5 data for each property
            ImpUtils.mkdir(os.path.join(config.BASEDIR, '2D_data'))
            local_hdf5 = h5py.File(os.path.join(config.BASEDIR, '2D_data', dataset_id+'_'+tableid+'.hdf5'), 'w', libver='latest')
            print "Copying HDF5 datasets"
            for property in table_settings['Properties']:
                print "..", property
                local_hdf5.copy(remote_hdf5[property['Id']], property['Id'])
                print "done"
            print "all copies complete"
            local_hdf5.close()
            remote_hdf5.close()
