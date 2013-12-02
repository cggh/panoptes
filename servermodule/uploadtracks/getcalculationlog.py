import os
import config
import VTTable


def response(returndata):

    filename = os.path.join(config.BASEDIR, 'temp', 'log_' + returndata['id'])
    if not os.path.exists(filename):
        returndata['Error'] = 'No log file present'
        return returndata

    with open(filename, 'r') as content_file:
        content = content_file.read()
    returndata['Content'] = content

    return returndata