import os
import DQXDbTools
import DQXUtils
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
        tableSettings.AddTokenIfMissing('ColumnIndexField', '')
        tableSettings.AddTokenIfMissing('RowDataTable', '')
        tableSettings.AddTokenIfMissing('RowIndexField', '')
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

        # if not importSettings['ConfigOnly']:
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





