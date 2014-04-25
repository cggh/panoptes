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

    dataFile = None
    if sourcetype == 'datatable':
        dataFile = os.path.join(baseFolder, databaseName, 'datatables', tableid, 'data')
    if sourcetype == 'customdata':
        dataFile = os.path.join(baseFolder, databaseName, 'workspaces', workspaceid, 'customdata', tableid, sourceid, 'data')
    if dataFile is None:
        returndata['Error'] = 'Invalid file source type'
        return returndata

    try:
        if not os.path.exists(dataFile):
            returndata['content'] = ''
        else:
            with open(dataFile, 'r') as fp:
                content = ''
                linecount = 0
                for line in fp:
                    content += line
                    if linecount > 100:
                        break
                    linecount += 1
                returndata['content'] = base64.b64encode_var2(content)

    except Exception as e:
        returndata['Error'] = str(e)

    return returndata