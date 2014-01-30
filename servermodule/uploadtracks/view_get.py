import DQXDbTools


def response(returndata):

    id = DQXDbTools.ToSafeIdentifier(returndata['id'])

    db = DQXDbTools.OpenDatabase(DQXDbTools.ParseCredentialInfo(returndata))
    cur = db.cursor()
    sqlstring = 'SELECT settings FROM storedviews WHERE id="{0}"'.format(id)
    cur.execute(sqlstring)
    therow = cur.fetchone()
    settings = therow[0]
    returndata['settings']=settings

    return returndata