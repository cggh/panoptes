import os
import config
import DQXDbTools
import authorization
import base64


def response(returndata):

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    sourceid = DQXDbTools.ToSafeIdentifier(returndata['sourceid'])

    # db = DQXDbTools.OpenDatabase(credInfo, databaseName)
    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, 'propertycatalog'))
    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, 'workspaces'))



    baseFolder = config.SOURCEDATADIR + '/datasets'
    dataPath = os.path.join(baseFolder, databaseName, 'workspaces', workspaceid, 'customdata', tableid, sourceid)

    try:
        os.remove(os.path.join(dataPath, 'data'))
        os.remove(os.path.join(dataPath, 'settings'))
        os.removedirs(dataPath)

    except Exception as e:
        returndata['Error'] = 'Failed to delete custom data: ' + str(e)

    return returndata