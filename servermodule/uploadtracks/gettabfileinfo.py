import os
import config
from DQXTableUtils import VTTable


def response(returndata):

    filename = os.path.join(config.BASEDIR, 'Uploads', returndata['fileid'])
    tb = VTTable.VTTable()
    tb.allColumnsText = True
    try:
        tb.LoadFile(filename, 100)
        columns = tb.GetColList()
        returndata['columns'] = ';'.join(columns)
    except Exception as e:
        returndata['Error'] = str(e)
        return returndata

    return returndata