import config
import os
import uuid
import DQXDbTools
import authorization

def response(returndata):


    credInfo = DQXDbTools.ParseCredentialInfo(returndata)
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])

    returndata['manager'] = authorization.IsDataSetManager(credInfo, databaseName)

    return returndata
