import os
import config
import DQXDbTools
import authorization
import base64


def response(returndata):

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])

    baseFolder = config.SOURCEDATADIR + '/datasets'
    settingsFile = os.path.join(baseFolder, databaseName, 'refgenome', 'chromosomes')

    try:
        if not os.path.exists(settingsFile):
            returndata['content'] = base64.b64encode_var2('chrom	length\nChrom_01\t1.54\nChrom_02\t0.85\n')
        else:
            with open(settingsFile, 'r') as fp:
                content = fp.read()
                returndata['content'] = base64.b64encode_var2(content)

    except Exception as e:
        returndata['Error'] = str(e)

    return returndata