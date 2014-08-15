# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import config
import authorization

# Verifies if a database operation can be done with given credentials

# We set our custom credential verifier
DQXDbTools.DbCredentialVerifier = authorization.CanDo

