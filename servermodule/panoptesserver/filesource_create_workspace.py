import os
import config
import DQXDbTools
import authorization
import DQXbase64
import shutil
import importer.ImpUtils as ImpUtils
import asyncresponder


def response(returndata):

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    authorization.VerifyIsDataSetManager(credInfo, databaseName)

    for char in ['.', ' ', ',', '/', '"', "'"]:
        workspaceid = workspaceid.replace(char, '_')
    returndata['workspaceid'] = workspaceid


    baseFolder = config.SOURCEDATADIR + '/datasets'

    try:
        dataFolder = os.path.join(baseFolder, databaseName)
        os.makedirs(os.path.join(dataFolder, 'workspaces', workspaceid))
        with open(os.path.join(dataFolder, 'workspaces', workspaceid, 'settings'), 'w') as fp:
            fp.write('Name: ' + workspaceid + '\n')

    except Exception as e:
        returndata['Error'] = 'Failed to create workspace: ' + str(e)

    return returndata