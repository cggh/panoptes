from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
from . import asyncresponder
import os
import config

def response(returndata):
    info = asyncresponder.GetCalculationInfo(returndata['calculationid'])
    if info is None:
        returndata['completed'] = True
    else:
        returndata['completed'] = info['completed']
        returndata['status'] = info['status']
        returndata['progress'] = info['progress']
        returndata['failed'] = info['failed']

    if 'showlog' in returndata:
        filename = os.path.join(config.BASEDIR, 'temp', 'log_' + returndata['calculationid'])
        if os.path.exists(filename):
            content = ''
            with open(filename, 'r') as content_file:
                for line in content_file:
                    try:
                        content += line.encode('ascii', 'ignore')
                    except UnicodeDecodeError as e:
                        content += '*** Failed to encode: ' + str(e) + '\n'

            returndata['log'] = content

    return returndata