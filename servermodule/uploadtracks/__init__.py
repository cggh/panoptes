import DQXDbTools
import config

print('IMPORTING UPLOADTRACKS')

# We inject some stuff that Panoptes needs to have privileges for to whitelists here
DQXDbTools.CredentialSettings.Write_Add(config.DB,'storedviews','.*')