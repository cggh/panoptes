import os
import config
import DQXDbTools
import authorization
import base64
import shutil
import importer.ImpUtils as ImpUtils
import asyncresponder


def response(returndata):

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)

    sourcetype = DQXDbTools.ToSafeIdentifier(returndata['sourcetype'])
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    sourceid = DQXDbTools.ToSafeIdentifier(returndata['sourceid'])

    baseFolder = config.SOURCEDATADIR + '/datasets'

    calculationObject = asyncresponder.CalculationThread('', None, {'isRunningLocal':'True'}, '')

    dataFolder = None
    if sourcetype == 'dataset':
        dataFolder = os.path.join(baseFolder, databaseName)
        authorization.VerifyIsDataSetManager(credInfo, databaseName)
        ImpUtils.ExecuteSQL(calculationObject, config.DB, 'DROP DATABASE IF EXISTS {0}'.format(databaseName))
        ImpUtils.ExecuteSQL(calculationObject, config.DB, 'DELETE FROM datasetindex WHERE id="{0}"'.format(databaseName))


    if sourcetype == 'datatable':
        dataFolder = os.path.join(baseFolder, databaseName, 'datatables', tableid)
        authorization.VerifyIsDataSetManager(credInfo, databaseName)
        ImpUtils.ExecuteSQL(calculationObject, databaseName, 'DROP TABLE IF EXISTS {0}'.format(tableid))
        ImpUtils.ExecuteSQL(calculationObject, databaseName, 'DELETE FROM tablecatalog WHERE id="{0}"'.format(tableid))
        ImpUtils.ExecuteSQL(calculationObject, databaseName, 'DELETE FROM propertycatalog WHERE tableid="{0}"'.format(tableid))
        ImpUtils.ExecuteSQL(calculationObject, databaseName, 'DELETE FROM summaryvalues WHERE tableid="{0}"'.format(tableid))

    if sourcetype == 'workspace':
        dataFolder = os.path.join(baseFolder, databaseName, 'workspaces', workspaceid)
        credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, 'workspaces'))

    if sourcetype == 'customdata':
        dataFolder = os.path.join(baseFolder, databaseName, 'workspaces', workspaceid, 'customdata', tableid, sourceid)
        credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, 'workspaces'))

    if dataFolder is None:
        returndata['Error'] = 'Invalid file source type'
        return returndata



    try:
        shutil.rmtree(dataFolder)

    except Exception as e:
        returndata['Error'] = 'Failed to delete custom data: ' + str(e)

    return returndata