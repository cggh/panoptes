import DQXDbTools
import config
import authorization

# Verifies if a database operation can be done with given credentials

# We set our custom credential verifier
DQXDbTools.DbCredentialVerifier = authorization.CanDo

