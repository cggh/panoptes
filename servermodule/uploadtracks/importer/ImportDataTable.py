import os
import DQXDbTools
import DQXUtils
import config
import customresponders.uploadtracks.VTTable as VTTable
import SettingsLoader
import ImpUtils
import LoadTable
import uuid
import sys
import shutil
import customresponders.uploadtracks.Utils as Utils




def ImportDataTable(calculationObject, datasetId, tableid, folder, importSettings):
    with calculationObject.LogHeader('Importing datatable {0}'.format(tableid)):
        print('Source: ' + folder)
        DQXUtils.CheckValidIdentifier(tableid)

        tableSettings = SettingsLoader.SettingsLoader(os.path.join(os.path.join(folder, 'settings')))
        tableSettings.RequireTokens(['NameSingle', 'NamePlural', 'PrimKey', 'Properties'])
        tableSettings.AddTokenIfMissing('IsPositionOnGenome', False)
        tableSettings.AddTokenIfMissing('MaxTableSize', None)
        extraSettings = tableSettings.Clone()
        extraSettings.DropTokens(['NamePlural', 'NameSingle', 'PrimKey', 'IsPositionOnGenome', 'Properties'])

        if tableSettings['MaxTableSize'] is not None:
            print('WARNING: table size limited to '+str(tableSettings['MaxTableSize']))

        # Add to tablecatalog
        sql = "INSERT INTO tablecatalog VALUES ('{0}', '{1}', '{2}', {3}, '{4}')".format(
            tableid,
            tableSettings['NamePlural'],
            tableSettings['PrimKey'],
            tableSettings['IsPositionOnGenome'],
            extraSettings.ToJSON()
        )
        ImpUtils.ExecuteSQL(calculationObject, datasetId, sql)

        properties = ImpUtils.LoadPropertyInfo(calculationObject, tableSettings, os.path.join(folder, 'data'))

        ranknr = 0
        for property in properties:
            propid = property['propid']
            settings = property['Settings']
            extraSettings = settings.Clone()
            extraSettings.DropTokens(['Name', 'DataType', 'Order','SummaryValues'])
            sql = "INSERT INTO propertycatalog VALUES ('', 'fixed', '{0}', '{1}', '{2}', '{3}', {4}, '{5}')".format(
                settings['DataType'],
                propid,
                tableid,
                settings['Name'],
                ranknr,
                extraSettings.ToJSON()
            )
            ImpUtils.ExecuteSQL(calculationObject, datasetId, sql)
            ranknr += 1



        propidList = []
        propDict = {}
        for property in properties:
            propDict[property['propid']] = property
            propidList.append(property['propid'])

        if tableSettings['IsPositionOnGenome']:
            if 'chrom' not in propDict:
                raise Exception('Genome-related datatable {0} is missing property "chrom"'.format(tableid))
            if 'pos' not in propDict:
                raise Exception('Genome-related datatable {0} is missing property "pos"'.format(tableid))

        if not importSettings['ConfigOnly']:
            columns = [ {'name': prop['propid'], 'DataType': prop['DataType'] } for prop in properties]
            LoadTable.LoadTable(
                calculationObject,
                os.path.join(folder, 'data'),
                datasetId,
                tableid,
                columns,
                tableSettings
            )
            if tableSettings['IsPositionOnGenome']:
                calculationObject.Log('Indexing chromosome')
                scr = ImpUtils.SQLScript(calculationObject)
                scr.AddCommand('create index {0}_chrompos ON {0}(chrom,pos)'.format(tableid))
                scr.Execute(datasetId)



        print('Creating summary values')
        for property in properties:
            propid = property['propid']
            settings = property['Settings']
            if settings.HasToken('SummaryValues'):
                with calculationObject.LogHeader('Creating summary values for {0}.{1}'.format(tableid,propid)):
                    summSettings = settings.GetSubSettings('SummaryValues')
                    if settings.HasToken('minval'):
                        summSettings.AddTokenIfMissing('MinVal', settings['minval'])
                    summSettings.AddTokenIfMissing('MaxVal', settings['maxval'])
                    sourceFileName = os.path.join(folder, 'data')
                    destFolder = os.path.join(config.BASEDIR, 'SummaryTracks', datasetId, propid)
                    if not os.path.exists(destFolder):
                        os.makedirs(destFolder)
                    dataFileName = os.path.join(destFolder, propid)
                    ImpUtils.ExtractColumns(calculationObject, sourceFileName, dataFileName, ['chrom', 'pos', propid], False)
                    ImpUtils.CreateSummaryValues(
                        calculationObject,
                        summSettings,
                        datasetId,
                        tableid,
                        'fixed',
                        '',
                        propid,
                        settings['Name'],
                        dataFileName,
                        importSettings
                    )

