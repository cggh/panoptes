import os
import config
import DQXDbTools
import authorization
import base64


def response(returndata):

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)

    sourcetype = DQXDbTools.ToSafeIdentifier(returndata['sourcetype'])
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    sourceid = DQXDbTools.ToSafeIdentifier(returndata['sourceid'])

    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, 'workspaces'))


    baseFolder = config.SOURCEDATADIR + '/datasets'

    settingsFile = None
    if sourcetype == 'dataset':
        settingsFile = os.path.join(baseFolder, databaseName, 'settings')
    if sourcetype == 'datatable':
        settingsFile = os.path.join(baseFolder, databaseName, 'datatables', tableid, 'settings')
    if sourcetype == 'customdata':
        settingsFile = os.path.join(baseFolder, databaseName, 'workspaces', workspaceid, 'customdata', tableid, sourceid, 'settings')
    if sourcetype == 'workspace':
        settingsFile = os.path.join(baseFolder, databaseName, 'workspaces', workspaceid, 'settings')
    if settingsFile is None:
        returndata['Error'] = 'Invalid file source type'
        return returndata;

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