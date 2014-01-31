import DQXDbTools
import config

print('IMPORTING UPLOADTRACKS')


def CanDo(credInfo, operation):
    return True

DQXDbTools.DbCredentialVerifier = CanDo

