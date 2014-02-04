import DQXDbTools
import config
import authorization

print('Defining Panoptes specifics')

# Verifies if a database operation can be done with given credentials

# We set our custom credential verifier
DQXDbTools.DbCredentialVerifier = authorization.CanDo

