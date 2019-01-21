# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
import cgi
import os
import sys
import config
import uuid
import DQXUtils


def response(returndata):
    environ=returndata['environ']

    if ('CONTENT_LENGTH' not in environ) or (len(environ['CONTENT_LENGTH']) == 0):
        returndata['Error'] = 'Failed to upload data: missing CONTENT_LENGTH'
        DQXUtils.LogServer('Failed to upload data: missing CONTENT_LENGTH')
        return returndata


    filesize = int(environ['CONTENT_LENGTH'])

    filename = str(uuid.uuid1())
    file_path = os.path.join(config.BASEDIR, 'Uploads', filename)

    readsize = 0
    with open(file_path, 'wb') as output_file:
        while readsize < filesize:
            blocksize = min(filesize-readsize, 1024)
            data = environ['wsgi.input'].read(blocksize)
            output_file.write(data)
            readsize += blocksize

    if filename:
        DQXUtils.LogServer('Uploaded file '+filename)
        returndata['filename'] = filename
    else:
        DQXUtils.LogServer('Failed to upload file')
        returndata['Error'] = 'Failed'


    return returndata
