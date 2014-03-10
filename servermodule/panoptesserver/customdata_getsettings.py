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

    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, 'workspaces'))


    baseFolder = config.SOURCEDATADIR + '/datasets'
    settingsFile = os.path.join(baseFolder, databaseName, 'workspaces', workspaceid, 'customdata', tableid, sourceid, 'settings')

    try:
        if not os.path.exists(settingsFile):
            returndata['content'] = ''
        else:
            with open(settingsFile, 'r') as fp:
                content = fp.read()
                returndata['content'] = base64.b64encode(content)

    except Exception as e:
        returndata['Error'] = str(e)

    return returndata