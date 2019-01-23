# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
import DQXDbTools
import uuid
import os
import config

def response(returndata):

    environ=returndata['environ']
    request_body_size = int(environ['CONTENT_LENGTH'])
    request_body = environ['wsgi.input'].read(request_body_size)

    id = str(uuid.uuid1())

    filename = os.path.join(config.BASEDIR, 'temp', 'store_'+id)
    with open(filename, 'w') as fp:
        fp.write(request_body)

    returndata['id']=id
    return returndata