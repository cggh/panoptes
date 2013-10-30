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