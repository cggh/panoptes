import DQXDbTools
import config

# Authorization managed by Panoptes
# Takes a DQXDbTools.CredentialInformation and DQXDbTools.DbOperation instance
# Returns a DQXDbTools.DbAuthorization instance
def CanDo(credInfo, operation):

    #print('CHECKING AUTH on '+credInfo.clientaddress)

    # Check for Panoptes-specific utility stuff

    # We can read everything from the index database
    if not(operation.IsModify()) and operation.OnDatabase(config.DB):
        return DQXDbTools.DbAuthorization(True)

    if operation.OnDatabase(config.DB):
        if operation.OnTable('storedviews'):
            return DQXDbTools.DbAuthorization(True)
    if operation.OnTable('storedqueries'):
        return DQXDbTools.DbAuthorization(True)
#    if operation.OnColumn('StoredSelection'):
#        return DQXDbTools.DbAuthorization(True)


    if operation.IsModify():
        return DQXDbTools.DbAuthorization(False, 'The login used does not allow you to perform this change.')

    return DQXDbTools.DbAuthorization(True)
