import os
import DQXDbTools
import DQXUtils
import config
import customresponders.uploadtracks.VTTable as VTTable
import SettingsLoader
import ImpUtils
import uuid
import sys
import shutil
import customresponders.uploadtracks.Utils as Utils




def ImportDataTable(calculationObject, datasetId, tableid, folder, importSettings):
    with calculationObject.LogHeader('Importing datatable {0}'.format(tableid)):
        print('Source: ' + folder)
        DQXUtils.CheckValidIdentifier(tableid)

        tableSettings = SettingsLoader.SettingsLoader(os.path.join(os.path.join(folder, 'settings')))
        tableSettings.RequireTokens(['NameSingle', 'NamePlural', 'PrimKey'])
        tableSettings.AddTokenIfMissing('IsPositionOnGenome', False)
        tableSettings.AddTokenIfMissing('MaxTableSize', None)
        extraSettings = tableSettings.Clone()
        extraSettings.DropTokens(['NamePlural', 'NameSingle', 'PrimKey', 'IsPositionOnGenome'])

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

        # Load & create properties
        properties = []
        for fle in os.listdir(os.path.join(folder, 'properties')):
            if os.path.isfile(os.path.join(folder, 'properties', fle)):
                if (fle.find('~') < 0) and (fle[0] != '.'):
                    properties.append({'propid':fle})
        print('Properties: '+str(properties))

        for property in properties:
            propid = property['propid']
            DQXUtils.CheckValidIdentifier(propid)
            settings = SettingsLoader.SettingsLoader(os.path.join(folder, 'properties', propid))
            settings.DefineKnownTokens(['isCategorical', 'minval', 'maxval', 'decimDigits', 'showInBrowser', 'showInTable', 'categoryColors'])
            settings.ConvertToken_Boolean('isCategorical')
            settings.RequireTokens(['Name', 'DataType'])
            settings.AddTokenIfMissing('Order', 99999)
            property['DataType'] = settings['DataType']
            property['Order'] = settings['Order']
            extraSettings = settings.Clone()
            extraSettings.DropTokens(['Name', 'DataType', 'Order','SummaryValues'])
            sql = "INSERT INTO propertycatalog VALUES ('', 'fixed', '{0}', '{1}', '{2}', '{3}', {4}, '{5}')".format(
                settings['DataType'],
                propid,
                tableid,
                settings['Name'],
                settings['Order'],
                extraSettings.ToJSON()
            )
            ImpUtils.ExecuteSQL(calculationObject, datasetId, sql)
            property['settings'] = settings







        properties = sorted(properties, key=lambda k: k['Order'])
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

        # Load datatable
        print('Loading data table')
        tb = VTTable.VTTable()
        tb.allColumnsText = True
        try:
            tb.LoadFile(os.path.join(folder, 'data'), tableSettings['MaxTableSize'])
        except Exception as e:
            raise Exception('Error while reading file: '+str(e))
        print('---- ORIG TABLE ----')
        tb.PrintRows(0, 9)

        for property in properties:
            if not tb.IsColumnPresent(property['propid']):
                raise Exception('Missing column "{0}" in datatable "{1}"'.format(property['propid'], tableid))

        if tableSettings['PrimKey'] not in propDict:
            raise Exception('Missing primary key property "{0}" in datatable "{1}"'.format(tableSettings['PrimKey'], tableid))

        for col in tb.GetColList():
            if col not in propDict:
                tb.DropCol(col)
        tb.ArrangeColumns(propidList)
        for property in properties:
            propid = property['propid']
            if property['DataType'] == 'Value':
                tb.ConvertColToValue(propid)
            if property['DataType'] == 'Boolean':
                tb.MapCol(propid, ImpUtils.convertToBooleanInt)
                tb.ConvertColToValue(propid)
        print('---- PROCESSED TABLE ----')
        tb.PrintRows(0, 9)

        createcmd = 'CREATE TABLE {0} ('.format(tableid)
        frst = True
        for property in properties:
            if not frst:
                createcmd += ', '
            propid = property['propid']
            colnr = tb.GetColNr(propid)
            datatypestr = ''
            if property['DataType'] == 'Text':
                maxlength = 1
                for rownr in tb.GetRowNrRange():
                    maxlength = max(maxlength, len(tb.GetValue(rownr, colnr)))
                datatypestr = 'varchar({0})'.format(maxlength)
            if property['DataType'] == 'Value':
                datatypestr = 'float'
            if property['DataType'] == 'Boolean':
                datatypestr = 'int'
            createcmd += propid + ' ' + datatypestr
            frst = False
        createcmd += ')'

        print('Creating datatable')
        scr = ImpUtils.SQLScript(calculationObject)
        scr.AddCommand('drop table if exists {0}'.format(tableid))
        scr.AddCommand(createcmd)
        scr.AddCommand('create unique index {0}_{1} ON {0}({1})'.format(tableid, tableSettings['PrimKey']))
        if tableSettings['IsPositionOnGenome']:
            scr.AddCommand('create index {0}_chrompos ON {0}(chrom,pos)'.format(tableid))
        scr.Execute(datasetId)

        print('Loading datatable values')
        sqlfile = ImpUtils.GetTempFileName()
        tb.SaveSQLDump(sqlfile, tableid)
        ImpUtils.ExecuteSQLScript(calculationObject, sqlfile, datasetId)
        os.remove(sqlfile)



        print('Creating summary values')
        for property in properties:
            propid = property['propid']
            settings = property['settings']
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
                        propid,
                        settings['Name'],
                        dataFileName
                    )

