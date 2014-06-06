# This file is part of Panoptes - © Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import asyncresponder

def response(returndata):
    info = asyncresponder.GetCalculationInfo(returndata['calculationid'])
    if info is None:
        returndata['completed'] = True
    else:
        returndata['completed'] = info['completed']
        returndata['status'] = info['status']
        returndata['progress'] = info['progress']
        returndata['failed'] = info['failed']
    return returndata