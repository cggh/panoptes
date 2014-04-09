import DQXDbTools
import authorization


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    id = DQXDbTools.ToSafeIdentifier(returndata['id'])

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)
    authorization.VerifyIsDataSetManager(credInfo, databaseName)

    db = DQXDbTools.OpenDatabase(credInfo, databaseName)
    cur = db.cursor()

    sql = 'DELETE FROM introviews WHERE id={id}'.format(
        id=id
    )
    cur.execute(sql)
    db.commit()
    db.close()

    return returndata