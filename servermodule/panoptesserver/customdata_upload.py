import os
import config
import DQXDbTools
import authorization
import shutil


def response(returndata):

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    fileid = DQXDbTools.ToSafeIdentifier(returndata['fileid'])
    sourceid = DQXDbTools.ToSafeIdentifier(returndata['sourceid'])

    for char in ['.', ' ', ',', '/']:
        sourceid = sourceid.replace(char, '_')


    baseFolder = config.SOURCEDATADIR + '/datasets'

    filename = os.path.join(config.BASEDIR, 'Uploads', DQXDbTools.ToSafeIdentifier(fileid))
    destFolder = os.path.join(baseFolder, databaseName, 'workspaces', workspaceid, 'customdata', tableid, sourceid)

    try:
        if not os.path.exists(destFolder):
            os.makedirs(destFolder)
        shutil.copyfile(filename, os.path.join(destFolder, 'data'))

        dataFileName = os.path.join(destFolder, 'settings')
        if not os.path.exists(dataFileName):
            with open(dataFileName, 'w') as fp:
                fp.write('AutoScanProperties: true\n')

    except Exception as e:
        returndata['Error'] = str(e)

    os.remove(filename)

    returndata['sourceid'] = sourceid
    return returndata