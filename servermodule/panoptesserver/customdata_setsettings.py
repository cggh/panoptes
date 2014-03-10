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
    content = base64.decodestring(returndata['content'])

    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, 'workspaces'))


    baseFolder = config.SOURCEDATADIR + '/datasets'
    settingsFile = os.path.join(baseFolder, databaseName, 'workspaces', workspaceid, 'customdata', tableid, sourceid, 'settings')

    try:
        with open(settingsFile, 'w') as fp:
            content = fp.write(content)

    except Exception as e:
        returndata['Error'] = str(e)

    return returndata