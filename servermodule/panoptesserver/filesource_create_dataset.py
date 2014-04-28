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
    authorization.VerifyIsDataSetManager(credInfo, databaseName)

    for char in ['.', ' ', ',', '/', '"', "'"]:
        databaseName = databaseName.replace(char, '_')
    returndata['database'] = databaseName


    baseFolder = config.SOURCEDATADIR + '/datasets'

    try:
        dataFolder = os.path.join(baseFolder, databaseName)
        if os.path.exists(dataFolder):
            returndata['Error'] = 'Dataset {0} already exists'.format(databaseName)
            return returndata
        os.makedirs(dataFolder)
        with open(os.path.join(dataFolder, 'settings'), 'w') as fp:
            fp.write('Name: {0}\n'.format(databaseName))
        os.makedirs(os.path.join(dataFolder, 'datatables'))
        os.makedirs(os.path.join(dataFolder, 'workspaces', 'workspace1'))
        with open(os.path.join(dataFolder, 'workspaces', 'workspace1', 'settings'), 'w') as fp:
            fp.write('Name: Workspace 1\n')

    except Exception as e:
        returndata['Error'] = 'Failed to create dataset: ' + str(e)

    return returndata