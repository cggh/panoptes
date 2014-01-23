import os
import DQXDbTools
import DQXUtils
import h5py
import config
from DQXTableUtils import VTTable
import SettingsLoader
import ImpUtils
import LoadTable
import uuid
import sys
import shutil
import customresponders.uploadtracks.Utils as Utils


tableOrder = 0

def ImportDataTable(calculationObject, datasetId, tableid, folder, importSettings):
    global tableOrder
    with calculationObject.LogHeader('Importing 2D datatable {0}'.format(tableid)):
        print('Source: ' + folder)
        DQXUtils.CheckValidIdentifier(tableid)

        tableSettings = SettingsLoader.SettingsLoader(os.path.join(os.path.join(folder, 'settings')))
        tableSettings.RequireTokens(['NameSingle', 'NamePlural'])
        tableSettings.AddTokenIfMissing('ShowInGenomeBrowser', False)
        tableSettings.AddTokenIfMissing('ColumnDataTable', '')
        tableSettings.AddTokenIfMissing('RowDataTable', '')
        extraSettings = tableSettings.Clone()
        extraSettings.DropTokens(['ColumnDataTable',
                                  'ColumnIndexField',
                                  'RowDataTable',
                                  'RowIndexField',
                                  'Properties'])

        #Check that the referenced tables exist and have the primary key specified.
        if tableSettings['ColumnDataTable']:
            sql = "SELECT id FROM tablecatalog WHERE id = '{0}'".format(tableSettings['ColumnDataTable'])
            id = ImpUtils.ExecuteSQLQuery(calculationObject, datasetId, sql)
            try:
                id = id[0][0]
            except IndexError:
                raise Exception("Index Table " + tableSettings['ColumnDataTable'] + " doesn't exist")
            sql = "SELECT {0} FROM {1} LIMIT 1".format(tableSettings['ColumnIndexField'],
                                                       tableSettings['ColumnDataTable'])
            try:
                field = ImpUtils.ExecuteSQLQuery(calculationObject, datasetId, sql)
            except:
                raise Exception(tableSettings['ColumnIndexField'] + " column index field doesn't exist in table " + tableSettings['ColumnDataTable'])
        if tableSettings['RowDataTable']:
            sql = "SELECT id FROM tablecatalog WHERE id = '{0}'".format(tableSettings['RowDataTable'])
            id = ImpUtils.ExecuteSQLQuery(calculationObject, datasetId, sql)
            try:
                id = id[0][0]
            except IndexError:
                raise Exception("Index Table " + tableSettings['RowDataTable'] + " doesn't exist")
            sql = "SELECT {0} FROM {1} LIMIT 1".format(tableSettings['RowIndexField'],
                                                       tableSettings['RowDataTable'])
            try:
                field = ImpUtils.ExecuteSQLQuery(calculationObject, datasetId, sql)
            except:
                raise Exception(tableSettings['RowIndexField'] + " row index field doesn't exist in table " + tableSettings['RowDataTable'])

        if tableSettings['ShowInGenomeBrowser']:
            sql = "SELECT IsPositionOnGenome FROM tablecatalog WHERE id='{0}' ".format(tableSettings['ColumnDataTable'])
            is_position = ImpUtils.ExecuteSQLQuery(calculationObject, datasetId, sql)[0][0]
            if not is_position:
                raise Exception(tableSettings['ColumnDataTable'] + ' is not a genomic position based table (IsPositionOnGenome in config), but you have asked to use this table as a column index on a genome browseable 2D array.')


        # Add to tablecatalog
        extraSettings.ConvertStringsToSafeSQL()
        sql = "INSERT INTO 2D_tablecatalog VALUES ('{0}', '{1}', '{2}', '{3}', '{4}', {5})".format(
            tableid,
            tableSettings['NamePlural'],
            tableSettings['ColumnDataTable'],
            tableSettings['RowDataTable'],
            extraSettings.ToJSON(),
            tableOrder
        )
        ImpUtils.ExecuteSQL(calculationObject, datasetId, sql)
        tableOrder += 1

        #TODO Can do properties table (not needed till 2D array browser)

        if not importSettings['ConfigOnly']:
            #Insert an index column into the index tables
            if tableSettings['ColumnDataTable']:
                #Firstly create a temporay table with the index array
                hdf5 = h5py.File(os.path.join(folder, 'data.hdf5'), 'r')
                try:
                    column_index = hdf5[tableSettings['ColumnIndexArray']]
                except KeyError:
                    raise Exception("HDF5 doesn't contain {0} at the root".format(tableSettings['ColumnIndexArray']))
                sql = ImpUtils.Numpy_to_SQL().create_table('TempColIndex', tableSettings['ColumnIndexField'], column_index)
                ImpUtils.ExecuteSQLGenerator(calculationObject, datasetId, sql)

                #We have a datatable - add an index to it then copy that index across to the data table
                sql = """ALTER TABLE `TempColIndex` ADD `index` INT DEFAULT NULL;
                         SELECT @i:=-1;UPDATE `TempColIndex` SET `index` = @i:=@i+1;
                         ALTER TABLE `{0}` ADD `{2}_column_index` INT DEFAULT NULL;
                         UPDATE `{0}` INNER JOIN `TempColIndex` ON `{0}`.`{1}` = `TempColIndex`.`{1}` SET `{0}`.`{2}_column_index` = `TempColIndex`.`index`;
                         DROP TABLE `TempColIndex`""".format(
                    tableSettings['ColumnDataTable'],
                    tableSettings['ColumnIndexField'],
                    tableid)
                ImpUtils.ExecuteSQL(calculationObject, datasetId, sql)
                #Now check we have no NULLS
                sql = "SELECT `{1}_column_index` from `{0}` where `{1}_column_index` IS NULL".format(
                    tableSettings['ColumnDataTable'],
                    tableid)
                nulls = ImpUtils.ExecuteSQLQuery(calculationObject, datasetId, sql)
                if len(nulls) > 0:
                    raise Exception("Not all rows in {0} have a corresponding column in 2D datatable {1}".format(tableSettings['ColumnDataTable'], tableid))
            if tableSettings['RowDataTable']:
                #Firstly create a temporay table with the index array
                hdf5 = h5py.File(os.path.join(folder, 'data.hdf5'), 'r')
                try:
                    row_index = hdf5[tableSettings['RowIndexArray']]
                except KeyError:
                    raise Exception("HDF5 doesn't contain {0} at the root".format(tableSettings['RowIndexArray']))
                sql = ImpUtils.Numpy_to_SQL().create_table('TempRowIndex', tableSettings['RowIndexField'], row_index)
                ImpUtils.ExecuteSQLGenerator(calculationObject, datasetId, sql)

                #We have a datatable - add an index to it then copy that index across to the data table
                sql = """ALTER TABLE `TempRowIndex` ADD `index` INT DEFAULT NULL;
                         SELECT @i:=-1;UPDATE `TempRowIndex` SET `index` = @i:=@i+1;
                         ALTER TABLE `{0}` ADD `{2}_row_index` INT DEFAULT NULL;
                         UPDATE `{0}` INNER JOIN `TempRowIndex` ON `{0}`.`{1}` = `TempRowIndex`.`{1}` SET `{0}`.`{2}_row_index` = `TempRowIndex`.`index`;
                         DROP TABLE `TempRowIndex`""".format(
                    tableSettings['RowDataTable'],
                    tableSettings['RowIndexField'],
                    tableid)
                ImpUtils.ExecuteSQL(calculationObject, datasetId, sql)
                #Now check we have no NULLS
                sql = "SELECT `{1}_row_index` from `{0}` where `{1}_row_index` IS NULL".format(
                    tableSettings['RowDataTable'],
                    tableid)
                nulls = ImpUtils.ExecuteSQLQuery(calculationObject, datasetId, sql)
                if len(nulls) > 0:
                    raise Exception("Not all rows in {0} have a corresponding row in 2D datatable {1}".format(tableSettings['RowDataTable'], tableid))






        #     columns = [ {
        #                     'name': prop['propid'],
        #                     'DataType': prop['DataType'],
        #                     'Index': prop['Settings']['Index'],
        #                     'ReadData': prop['Settings']['ReadData']
        #                 }
        #                 for prop in properties if (prop['propid'] != 'AutoKey')]
        #     LoadTable.LoadTable(
        #         calculationObject,
        #         os.path.join(folder, 'data'),
        #         datasetId,
        #         tableid,
        #         columns,
        #         tableSettings
        #     )
        #     if tableSettings['IsPositionOnGenome']:
        #         calculationObject.Log('Indexing chromosome')
        #         scr = ImpUtils.SQLScript(calculationObject)
        #         scr.AddCommand('create index {0}_chrompos ON {0}(chrom,pos)'.format(tableid))
        #         scr.Execute(datasetId)
        #
        #
        #
        # print('Creating summary values')
        # for property in properties:
        #     propid = property['propid']
        #     settings = property['Settings']
        #     if settings.HasTok14en('SummaryValues'):
        #         with calculationObject.LogHeader('Creating summary values for {0}.{1}'.format(tableid,propid)):
        #             summSettings = settings.GetSubSettings('SummaryValues')
        #             if settings.HasToken('minval'):
        #                 summSettings.AddTokenIfMissing('MinVal', settings['minval'])
        #             summSettings.AddTokenIfMissing('MaxVal', settings['maxval'])
        #             sourceFileName = os.path.join(folder, 'data')
        #             destFolder = os.path.join(config.BASEDIR, 'SummaryTracks', datasetId, propid)
        #             if not os.path.exists(destFolder):
        #                 os.makedirs(destFolder)
        #             dataFileName = os.path.join(destFolder, propid)
        #             ImpUtils.ExtractColumns(calculationObject, sourceFileName, dataFileName, ['chrom', 'pos', propid], False)
        #             ImpUtils.CreateSummaryValues(
        #                 calculationObject,
        #                 summSettings,
        #                 datasetId,
        #                 tableid,
        #                 'fixed',
        #                 '',
        #                 propid,
        #                 settings['Name'],
        #                 dataFileName,
        #                 importSettings
        #             )
        #
        # if tableSettings.HasToken('TableBasedSummaryValues'):
        #     calculationObject.Log('Processing table-based summary values')
        #     if not type(tableSettings['TableBasedSummaryValues']) is list:
        #         raise Exception('TableBasedSummaryValues token should be a list')
        #     for stt in tableSettings['TableBasedSummaryValues']:
        #         summSettings = SettingsLoader.SettingsLoader()
        #         summSettings.LoadDict(stt)
        #         summSettings.RequireTokens(['Id', 'Name', 'MaxVal', 'BlockSizeMax'])
        #         summSettings.AddTokenIfMissing('MinVal', 0)
        #         summSettings.AddTokenIfMissing('BlockSizeMin', 1)
        #         summSettings.DefineKnownTokens(['channelColor'])
        #         summaryid = summSettings['Id']
        #         with calculationObject.LogHeader('Table based summary value {0}, {1}'.format(tableid, summaryid)):
        #             extraSummSettings = summSettings.Clone()
        #             extraSummSettings.DropTokens(['Id', 'Name', 'MinVal', 'MaxVal', 'BlockSizeMin', 'BlockSizeMax'])
        #             sql = "INSERT INTO tablebasedsummaryvalues VALUES ('{0}', '{1}', '{2}', '{3}', {4}, {5}, {6})".format(
        #                 tableid,
        #                 summaryid,
        #                 summSettings['Name'],
        #                 extraSummSettings.ToJSON(),
        #                 summSettings['MinVal'],
        #                 summSettings['MaxVal'],
        #                 summSettings['BlockSizeMin']
        #             )
        #             ImpUtils.ExecuteSQL(calculationObject, datasetId, sql)
        #             for fileid in os.listdir(os.path.join(folder, summaryid)):
        #                 if not(os.path.isdir(os.path.join(folder, summaryid, fileid))):
        #                     calculationObject.Log('Processing '+fileid)
        #                     destFolder = os.path.join(config.BASEDIR, 'SummaryTracks', datasetId, 'TableTracks', tableid, summaryid, fileid)
        #                     calculationObject.Log('Destination: '+destFolder)
        #                     if not os.path.exists(destFolder):
        #                         os.makedirs(destFolder)
        #                     shutil.copyfile(os.path.join(folder, summaryid, fileid), os.path.join(destFolder, summaryid+'_'+fileid))
        #                     ImpUtils.ExecuteFilterbankSummary(calculationObject, destFolder, summaryid+'_'+fileid, summSettings)





