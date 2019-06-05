# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
import re

import simplejson
import DQXbase64
import pymonetdb.sql
import config
import os

#As we created the DB and it is only listening on localhost set these here
config.DBUSER = 'monetdb'
config.DBPASS = 'monetdb'
config.DBSRV = 'localhost'
config.DB = 'datasets'
import time

LogRequests = True


# Enumerates types of actions that can be done on a database entity
class DbOperationType:
    read = 1
    write = 2


# Encapsulates an operation that is done on a database entity
class DbOperation:
    def __init__(self, operationType, databaseName, tableName=None, columnName=None):
        if (databaseName is None) or (databaseName == ''):
            databaseName = config.DB
        self.operationType = operationType
        self.databaseName = databaseName
        self.tableName = tableName
        self.columnName = columnName

    def IsModify(self):
        return self.operationType == DbOperationType.write

    def OnDatabase(self, databaseName):
        return self.databaseName == databaseName

    def OnTable(self, tableName):
        return self.tableName == tableName

    def OnColumn(self, columnName):
        return self.columnName == columnName

    def __str__(self):
        st = ''
        if (self.operationType == DbOperationType.read):
            st += 'Read'
        if (self.operationType == DbOperationType.write):
            st += 'Write'
        st += ':'
        st += self.databaseName
        if self.tableName is not None:
            st += ':' + self.tableName
        if self.columnName is not None:
            st += ':' + self.columnName
        return st


# Encapsulates a read operation that is done on a database entity
class DbOperationRead(DbOperation):
    def __init__(self, databaseName, tableName=None, columnName=None):
        DbOperation.__init__(self, DbOperationType.read, databaseName, tableName, columnName)


# Encapsulates a write operation that is done on a database entity
class DbOperationWrite(DbOperation):
    def __init__(self, databaseName, tableName=None, columnName=None):
        DbOperation.__init__(self, DbOperationType.write, databaseName, tableName, columnName)


# Encapsulates the result of an authorisation request on a database operation
class DbAuthorization:
    def __init__(self, granted, reason=None):
        self.granted = granted
        if reason is None:
            if not granted:
                reason = 'Insufficient privileges to perform this action.'
            else:
                reason = ''
        self.reason = reason
    def IsGranted(self):
        return self.granted
    def __str__(self):
        return self.reason
    def __nonzero__(self):
        return self.granted
    def __bool__(self):
        return self.granted


# Define a custom credential handler here by defining function taking a DbOperation and a CredentialInformation
# returning a DbAuthorization instance
DbCredentialVerifier = None


class CredentialException(Exception):
    def __init__(self, message):
        Exception.__init__(self, message)

class CredentialDatabaseException(CredentialException):
    def __init__(self, operation, auth):
        st = str(auth) + " \n\n[" + str(operation) + ']'
        CredentialException.__init__(self, st)



# Encapsulates information about the credentials a user has
class CredentialInformation:
    def __init__(self, requestData=None):
        self.clientaddress = None
        self.userid = 'anonymous'
        self.groupids = []

        if requestData:
            if ('isRunningLocal' in requestData) and (requestData['isRunningLocal']):
                self.userid = 'local'
                return

            if 'environ' not in requestData:
                raise Exception('Data does not contain environment information')
            environ = requestData['environ']
            #print('ENV:'+str(environ))

            if 'REMOTE_ADDR' in environ:
                self.clientaddress = environ['REMOTE_ADDR']
            if 'REMOTE_USER' in environ:
                self.userid = environ['REMOTE_USER']
            if 'HTTP_CAS_MEMBEROF' in environ:
                cas_memberof = environ['HTTP_CAS_MEMBEROF'].strip('[]')
                if cas_memberof and cas_memberof != 'None':
                    for groupStr in cas_memberof.split(';'):
                        groupStr = groupStr.strip(' ')
                        groupPath = []
                        for tokenStr in groupStr.split(','):
                            tokenStr = tokenStr.strip(' ')
                            tokenid = tokenStr.split('=')[0]
                            tokencontent = tokenStr.split('=')[1]
                            if (tokenid == 'cn') or (tokenid == 'ou') or (tokenid == 'dc'):
                                groupPath.append(tokencontent)
                        self.groupids.append('.'.join(groupPath))


    # operation is of type DbOperation
    def CanDo(self, operation):
        if DbCredentialVerifier is not None:
            auth = DbCredentialVerifier(self, operation)
            return auth.IsGranted()
        else:
            return True

    # operation is of type DbOperation. raises an exception of not authorised
    def VerifyCanDo(self, operation):
        if DbCredentialVerifier is not None:
            auth = DbCredentialVerifier(self, operation)
            if not(auth.IsGranted()):
                raise CredentialDatabaseException(operation, auth)

    def GetAuthenticationInfo(self):
        str = ''
        str += 'USER=' + self.userid
        str += ';CLIENTADDRESS=' + self.clientaddress
        str += ';GROUPS=' + ','.join(self.groupids)
        return str

    def GetUserId(self):
        return self.userid

    def get_auth_query(self, database, tables):
        from responders.importer import configReadWrite
        if database != 'datasets':
            dataset_config = configReadWrite.getJSONConfig(database,
                                                           not os.getenv('STAGING', '') and not os.getenv('DEVELOPMENT',
                                                                                                          ''))
            auth_groups = dataset_config['settings'].get('authGroups', {})
            allowed_auth_values = {dataset_config['settings']['authUnrestrictedValue']}
        else:
            auth_groups = {}
            allowed_auth_values = set()
        for group_id in self.groupids:
            for group_id_pattern, allowed_for_this_group in auth_groups.items():
                if allowed_auth_values == 'all':
                    continue
                if re.search(group_id_pattern, group_id):
                    if allowed_for_this_group == 'all':
                        allowed_auth_values = 'all'
                    elif isinstance(allowed_for_this_group, list):
                        allowed_auth_values.update(
                            re.sub(group_id_pattern, entry, group_id) for entry in allowed_for_this_group)
                    else:
                        SyntaxError('authGroups setting contains an entry that is not "all" or a list of allowed values')
        allowed_auth_values = 'all' if allowed_auth_values == 'all' else tuple(allowed_auth_values)
        auth_subqueries = []
        for table in tables:
            if database != 'datasets' and table not in  ["_sequence_", "annotation"]: #Ref seq table and annotation doesn't have config. FIXME: Not a good idea that annotation table has a potentially colliding name
                auth_property = dataset_config['tablesById'][table].get('authProperty', None)
            else:
                auth_property = None
            if auth_property and allowed_auth_values != 'all':
                auth_subqueries.append({
                    "whcClass": "compound",
                    "isCompound": True,
                    "Tpe": "OR",
                    "Components": [{
                        "whcClass": "comparefixed",
                        "isCompound": False,
                        "ColName": "{}.{}".format(DBCOLESC(table), DBCOLESC(auth_property)),
                        "CompValue": allowed_value,
                        "Tpe": "="
                    } for allowed_value in allowed_auth_values]
                })
        if auth_subqueries:
            auth_query = {
                "whcClass": "compound",
                "isCompound": True,
                "Tpe": "AND",
                "Components": auth_subqueries
            }
        else:
            auth_query = None
        return auth_query

class Timeout(Exception):
    pass

class DBCursor(object):
    def __init__(self, cred_data_or_cred=None, db=None, **kwargs):

        #monet doesn't do timeouts this way, so disable for now
        if 'read_timeout' in kwargs:
            del kwargs['read_timeout']

        self.db_args = {
            'host': config.DBSRV,
            'autocommit': True
        }
        self.db_args['user'] = config.DBUSER
        self.db_args['password'] = config.DBPASS
        self.db_args['database'] = db or config.DB

        self.db_args.update(kwargs)

        if type(cred_data_or_cred) == type(CredentialInformation()):
            self.credentials = cred_data_or_cred
        else:
            self.credentials = CredentialInformation(cred_data_or_cred)
        self.db = None
        self.cursor = None
        self.conn_id = None

    def __enter__(self):
        self.credentials.VerifyCanDo(DbOperationRead(self.db_args['database']))
        self.db = pymonetdb.connect(**self.db_args)
        self.db.arraysize = 1000
        self.db.autocommit = self.db_args.get('autocommit', False)
        self.cursor = self.db.cursor()
        #Needed for timeout which is currently disabled
        # self.cursor.execute("SELECT CONNECTION_ID();")
        # self.conn_id = self.cursor.fetchall()[0][0]
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cursor.close()
        self.db.close()

    def execute(self, query, params=None):
        #TODO - reinstate this mechanism for monet
        # if 'read_timeout' not in self.db_args:
            retry = True
            while retry:
                try:
                    # print repr(query), repr(params)
                    result = self.cursor.execute(query, params)
                    retry = False
                except pymonetdb.exceptions.ProgrammingError as e:
                    if '40000' in str(e):
                        retry = True
                    else:
                        raise e
            return result
        # else:
        #     timeout = self.db_args['read_timeout']
        #     t = time.time()
        #     try:
        #         return self.cursor.execute(query, params)
        #     except MySQLdb.OperationalError as e:
        #         if e[0] == 2013: #Check specific error code (Lost connection)
        #             #As the MYSQL API doesn't tell us this is a timeout or not we
        #             #guess based on the fact that the exception was raised just
        #             # when we expect it to be.... yeah I know.
        #             duration = (time.time() - t)
        #             #Re-connect and kill the query
        #             self.db = MySQLdb.connect(**self.db_args)
        #             self.cursor = self.db.cursor()
        #             self.cursor.execute("KILL %s", (self.conn_id,))
        #             #Give 50ms grace in either dir
        #             if (duration > timeout - 0.05) and (duration < timeout + 0.05):
        #                 raise Timeout
        #
        #         raise e

    def commit(self):
        if not self.db.autocommit:
            self.db.commit()

    def __getattr__(self, attrname):
        return getattr(self.cursor, attrname)   # Delegate to actual cursor


def ToSafeIdentifier(st):
    st = str(st)
    if st is not None:
        removelist=['"', "'", ';', '`', '\x00', '\n', '\r', '\x1a']
        for it in removelist:
            st = st.replace(it, "")
    return st


def DBCOLESC(arg):
    if arg == "*":
        return arg
    if '.' in arg:
        table, column = arg.split('.')
        return '"'+ToSafeIdentifier(table)+'"."'+ToSafeIdentifier(column)+'"'
    else:
        return '"'+ToSafeIdentifier(arg)+'"'

def DBTBESC(arg):
    if '.' in arg:
        schema, table = arg.split('.')
        return '"'+ToSafeIdentifier(schema)+'"."'+ToSafeIdentifier(table)+'"'
    return '"'+ToSafeIdentifier(arg)+'"'

def DBDBESC(arg):
    return '"'+ToSafeIdentifier(arg)+'"'

#parse column encoding information
def ParseColumnEncoding(columnstr):
    mycolumns=[]
    for colstr in columnstr.split('~'):
        mycolumns.append( { 'Encoding':colstr[0:2], 'Name':ToSafeIdentifier(colstr[2:]) } )
    return mycolumns


#A whereclause encapsulates the where statement of a single table sql query
class WhereClause:
    def __init__(self):
        self.query = None #this contains a tree of statements
        self.ParameterPlaceHolder = "?" #determines what is the placeholder for a parameter to be put in an sql where clause string

    #Decodes an url compatible encoded query into the statement tree
    def Decode(self, str, noBase64=False):
        if not noBase64:
            str = DQXbase64.b64decode_var2(str)
        self.query = simplejson.loads(str)
        pass

    #Creates an SQL where clause string out of the statement tree
    def CreateSelectStatement(self):
        self.querystring = '' #will hold the fully filled in standalone where clause string (do not use this if sql injection is an issue!)
        self.querystring_params = '' #will hold the parametrised where clause string
        self.queryparams = [] #will hold a list of parameter values
        self._CreateSelectStatementSub(self.query)

    def _CreateSelectStatementSub_Compound(self, statm):
        if not(statm['Tpe'] in ['AND', 'OR']):
            raise Exception("Invalid compound statement {0}".format(statm['Tpe']))
        first = True
        for comp in statm['Components']:
            if comp['whcClass'] == 'trivial' or comp.get('isTrivial', False):
                continue
            if not first:
                self.querystring += " "+statm['Tpe']+" "
                self.querystring_params += " "+statm['Tpe']+" "
            self.querystring += "("
            self.querystring_params += "("
            self._CreateSelectStatementSub(comp)
            self.querystring += ")"
            self.querystring_params += ")"
            first = False

    def _CreateSelectStatementSub_Comparison(self, statm):
        #TODO: check that statm['ColName'] corresponds to a valid column name in the table (to avoid SQL injection)
        if not(statm['Tpe'] in ['=', '<>', '<', '>', '<=', '>=', '!=', 'LIKE', 'CONTAINS', 'CONTAINS_CASE_INSENSITIVE', 'NOTCONTAINS', 'NOT_CONTAINS_CASE_INSENSITIVE', 'STARTSWITH', 'ENDSWITH', 'ISPRESENT', 'ISABSENT', '=FIELD', '<>FIELD', '<FIELD', '>FIELD', 'between', 'ISEMPTYSTR', 'ISNOTEMPTYSTR', '_subset_', '_note_']):
            raise Exception("Invalid comparison statement {0}".format(statm['Tpe']))

        processed = False

        if statm['Tpe'] == 'ISPRESENT':
            processed = True
            st = '{0} IS NOT NULL'.format(DBCOLESC(statm['ColName']))
            self.querystring += st
            self.querystring_params += st

        if statm['Tpe'] == 'ISABSENT' or \
                (statm['Tpe'] == '=' and statm['CompValue'] is None) or \
                (statm['Tpe'] == '=' and statm['CompValue'] == ''):
            processed = True
            st = '{0} IS NULL'.format(DBCOLESC(statm['ColName']))
            self.querystring += st
            self.querystring_params += st

        if statm['Tpe'] == 'ISEMPTYSTR':
            processed = True
            st = '{0}=\'\''.format(DBCOLESC(statm['ColName']))
            self.querystring += st
            self.querystring_params += st

        if statm['Tpe'] == 'ISNOTEMPTYSTR':
            processed = True
            st = '{0}<>\'\''.format(DBCOLESC(statm['ColName']))
            self.querystring += st
            self.querystring_params += st

        if statm['Tpe'] == '=FIELD':
            processed = True
            st = '{0}={1}'.format(
                DBCOLESC(statm['ColName']),
                DBCOLESC(statm['ColName2'])
            )
            self.querystring += st
            self.querystring_params += st

        if statm['Tpe'] == '<>FIELD':
            processed = True
            st = '{0}<>{1}'.format(
                DBCOLESC(statm['ColName']),
                DBCOLESC(statm['ColName2'])
            )
            self.querystring += st
            self.querystring_params += st

        if (statm['Tpe'] == '<FIELD') or (statm['Tpe'] == '>FIELD'):
            processed = True
            operatorstr = statm['Tpe'].split('FIELD')[0]
            self.querystring += '{0} {4} {1} * {2} + {3}'.format(
                DBCOLESC(statm['ColName']),
                ToSafeIdentifier(statm['Factor']),
                DBCOLESC(statm['ColName2']),
                ToSafeIdentifier(statm['Offset']),
                operatorstr)
            self.querystring_params += '{0} {4} {1} * {2} + {3}'.format(
                DBCOLESC(statm['ColName']),
                self.ParameterPlaceHolder,
                DBCOLESC(statm['ColName2']),
                self.ParameterPlaceHolder,
                operatorstr)
            self.queryparams.append(ToSafeIdentifier(statm['Factor']))
            self.queryparams.append(ToSafeIdentifier(statm['Offset']))

        if statm['Tpe'] == 'between':
            processed = True
            self.querystring += DBCOLESC(statm['ColName'])+' between '+ToSafeIdentifier(statm["CompValueMin"])+' and '+ToSafeIdentifier(statm["CompValueMax"])
            self.querystring_params += '{0} between {1} and {1}'.format(DBCOLESC(statm['ColName']), self.ParameterPlaceHolder)
            self.queryparams.append(ToSafeIdentifier(statm["CompValueMin"]))
            self.queryparams.append(ToSafeIdentifier(statm["CompValueMax"]))

        if statm['Tpe'] == '_subset_':
            processed = True
            querystr = '{primkey} IN (SELECT {primkey} FROM {subsettable} WHERE subsetid={subsetid})'.format(
                primkey=DBCOLESC(ToSafeIdentifier(statm['PrimKey'])),
                subsettable=DBTBESC(ToSafeIdentifier(statm['SubsetTable'])),
                subsetid=ToSafeIdentifier(statm['Subset'])
            )
            self.querystring += querystr
            self.querystring_params += querystr

        if statm['Tpe'] == '_note_':
            processed = True

            param = ToSafeIdentifier(statm['NoteText']) + '*'
            if len(statm['NoteText']) == 0:
                whereclause='TRUE'
                pass
            else:
                whereclause = 'MATCH(`content`) AGAINST (__param__ IN BOOLEAN MODE)'
                self.queryparams.append(param)

            querystr = '{primkey} IN (SELECT `itemid` FROM `notes` WHERE (`tableid`="{tableid}") and ({whereclause}))'.format(
#            querystr = '{primkey} IN (SELECT `itemid` FROM `notes` WHERE (`tableid`="{tableid}") and (`content` LIKE __param__))'.format(
                whereclause=whereclause,
                tableid=ToSafeIdentifier(statm['NoteItemTable']),
                primkey=DBCOLESC(ToSafeIdentifier(statm['PrimKey']))
            )
            self.querystring += querystr.replace('__param__', '"' + param + '"')
            self.querystring_params += querystr.replace('__param__', self.ParameterPlaceHolder)

        if not(processed):
            decoval = statm['CompValue']
            operatorstr = statm['Tpe']
            if operatorstr == 'CONTAINS':
                operatorstr = 'LIKE'
                decoval = '%{0}%'.format(decoval)
            if operatorstr == 'NOTCONTAINS':
                operatorstr = 'NOT LIKE'
                decoval = '%{0}%'.format(decoval)
            if operatorstr == 'STARTSWITH':
                operatorstr = 'LIKE'
                decoval = '{0}%'.format(decoval)
            if operatorstr == 'ENDSWITH':
                operatorstr = 'LIKE'
                decoval = '%{0}'.format(decoval)
            if operatorstr == 'CONTAINS_CASE_INSENSITIVE':
                operatorstr = 'LIKE'
                decoval = '%{0}%'.format(decoval)
                self.querystring += DBCOLESC(statm['ColName']) + ' ' + ToSafeIdentifier(operatorstr) + ' '
                self.querystring_params += '{0} {1} {2}'.format(
                    'UPPER(' + DBCOLESC(statm['ColName']) + ')',
                    ToSafeIdentifier(operatorstr),
                    'UPPER(' + self.ParameterPlaceHolder) + ')'
            if operatorstr == 'NOT_CONTAINS_CASE_INSENSITIVE':
                operatorstr = 'NOT LIKE'
                decoval = '%{0}%'.format(decoval)
                self.querystring += DBCOLESC(statm['ColName']) + ' ' + ToSafeIdentifier(operatorstr) + ' '
                self.querystring_params += '{0} {1} {2}'.format(
                    'UPPER(' + DBCOLESC(statm['ColName']) + ')',
                    ToSafeIdentifier(operatorstr),
                    'UPPER(' + self.ParameterPlaceHolder) + ')'
            else:
                self.querystring += DBCOLESC(statm['ColName']) + ' ' + ToSafeIdentifier(operatorstr) + ' '
                self.querystring_params += '{0} {1} {2}'.format(
                    DBCOLESC(statm['ColName']),
                    ToSafeIdentifier(operatorstr),
                    self.ParameterPlaceHolder)
            needquotes = (type(decoval) is not float) and (type(decoval) is not int) and (type(decoval) is not bool)
            needstring = type(decoval) is not bool
            if needquotes:
                self.querystring += "'"
                decoval = decoval.replace("'", "")
            elif needstring:
                decoval = ToSafeIdentifier(str(decoval))
            self.querystring += str(decoval)
            if needquotes:
                self.querystring += "'"
            self.queryparams.append(decoval)

    def _CreateSelectStatementSub(self, statm):
        if statm['Tpe'] == '':
            return #trivial query
        self.querystring += "("
        self.querystring_params += "("
        if (statm['Tpe'] == 'AND') or (statm['Tpe'] == 'OR'):
            self._CreateSelectStatementSub_Compound(statm)
        else:
            self._CreateSelectStatementSub_Comparison(statm)
        self.querystring += ")"
        self.querystring_params += ")"





#unpacks an encoded 'order by' statement into an SQL statement
def CreateOrderByStatement(orderstr,reverse=False):
    if (len(orderstr) ==0) or orderstr == 'null':
        return "NULL"
    dirstr = ""
    if reverse: dirstr=" DESC"
    #note the following sql if construct is used to make sure that sorting always puts absent values at the end, which is what we want

    ### !!! todo: make this choice dependent on client
    # option 1 = better, slower (absent appear beneath)
    # opten 2 = sloppier, a lot faster
#    return ', '.join( [ "IF(ISNULL({0}),1,0),{0}{1}".format(DBCOLESC(field),dirstr) for field in orderstr.split('~') ] )
    return ', '.join( [ "{0}{1}".format(DBCOLESC(field), dirstr) for field in orderstr.split('~') ] )

def desciptionToDType(col_type):
    dtype = {
        'boolean': 'i1',
        'char': 'u1',
        'tinyint': 'i1',
        'smallint': 'i2',
        'int': 'i4',
        'bigint': 'i4', # FIXME: truncating because 64-bit is not supported in JS
        'double': 'f8',
        'float': 'f8',
        'real': 'f4',
        'wrd': 'i4', #Monet returns this type for count(*) - it is 64bit but that is not supported by JS
        'clob': 'S',
        'timestamp': 'f8' #We convert to this in query.py
    }
    return dtype[col_type]