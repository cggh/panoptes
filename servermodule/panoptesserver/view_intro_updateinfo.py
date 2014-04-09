import DQXDbTools
import authorization


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    id = DQXDbTools.ToSafeIdentifier(returndata['id'])
    name ='No name'
    if 'name' in returndata:
        name = returndata['name']
    section = ''
    if 'section' in returndata:
        section = returndata['section']
    description = ''
    if 'description' in returndata:
        description = returndata['description']

    #Obtain the settings from storeddata
    credInfo = DQXDbTools.ParseCredentialInfo(returndata)
    authorization.VerifyIsDataSetManager(credInfo, databaseName)

    db = DQXDbTools.OpenDatabase(credInfo, databaseName)
    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(None, 'storedviews'))
    cur = db.cursor()


    sql = 'UPDATE introviews SET name="{name}", section="{section}", description="{description}" WHERE id="{id}"'.format(
        name=name,
        section=section,
        description=description,
        id=id
    )
    cur.execute(sql)
    db.commit()
    db.close()

    return returndata