# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import authorization
from importer import readConfig

def response(returndata):
    DQXDbTools.CredentialInformation(returndata).VerifyCanDo(DQXDbTools.DbOperationRead(returndata['dataset']))
    returndata['config'] = readConfig.readJSONConfig(returndata['dataset'])
    return returndata
