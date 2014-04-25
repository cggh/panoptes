import os
import config
import DQXDbTools
import authorization
import base64


def response(returndata):

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    authorization.VerifyIsDataSetManager(credInfo, databaseName)

    encodedstr = returndata['content']

    content = base64.b64decode_var2(encodedstr)

    baseFolder = config.SOURCEDATADIR + '/datasets'
    genomeFolder = os.path.join(baseFolder, databaseName, 'refgenome')
    settingsFile = os.path.join(genomeFolder, 'settings')

    try:
        if not os.path.exists(genomeFolder):
            os.makedirs(genomeFolder)
        with open(settingsFile, 'w') as fp:
            fp.write(content)

    except Exception as e:
        returndata['Error'] = str(e)

    return returndata