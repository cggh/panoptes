# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import config
import unidecode


def response(returndata):

    filename = os.path.join(config.BASEDIR, 'temp', 'log_' + returndata['id'])
    if not os.path.exists(filename):
        returndata['Error'] = 'No log file present'
        return returndata

    content = ''
    with open(filename, 'r') as content_file:
        for line in content_file:
            strippedline = line.lstrip()
            if (strippedline[0:3]!='@@@'):
                content += line

    returndata['Content'] = content

    return returndata