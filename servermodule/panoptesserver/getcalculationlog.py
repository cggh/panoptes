import os
import config
from DQXTableUtils import VTTable
import base64
import unicodedata


def response(returndata):

    filename = os.path.join(config.BASEDIR, 'temp', 'log_' + returndata['id'])
    if not os.path.exists(filename):
        returndata['Error'] = 'No log file present'
        return returndata

    content = ''
    with open(filename, 'r') as content_file:
        for line in content_file:
            try:
                content += line.encode('ascii', 'ignore')
            except UnicodeDecodeError as e:
                content += '*** Failed to encode: ' + str(e) + '\n'

    returndata['Content'] = content

    return returndata