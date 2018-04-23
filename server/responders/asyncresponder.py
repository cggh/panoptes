# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import threading
import uuid
import DQXDbTools
# import pymonetdb.sql
import DQXUtils
import datetime
import config
import os
import sys




class CalculationThreadList:
    def __init__(self):
        self.threads = {}
        self.lock = threading.Lock()

    def AddThread(self,id, calculationname, userid):
        with self.lock:
            self.threads[id] = {'status': 'Calculating', 'progress': None, 'failed': False}
        with DQXDbTools.DBCursor() as cur:
            timestamp = str(datetime.datetime.now())[0:19]
            sqlstring = "INSERT INTO calculations VALUES ('{0}', '{1}', '{2}', '{3}', 'Calculating', 0, 0, 0, '')".format(
                id,
                userid,
                timestamp,
                calculationname
            )
            cur.execute(sqlstring)
            cur.commit()


    def DelThread(self, id):
        hasfailed = False
        with self.lock:
            if id in self.threads:
                hasfailed = self.threads[id]['failed']
                del self.threads[id]
        with DQXDbTools.DBCursor() as cur:
            if not(hasfailed):
                sqlstring = "UPDATE calculations SET completed=1, status='Finished', progress=0 WHERE id='{0}'".format(id)
                cur.execute(sqlstring)
                cur.commit()

    def SetInfo(self, id, status, progress):

        def cap(s, l):
            return s if len(s)<=l else s[0:l-3]+'...'

        if progress is None:
            progress = 0
        with self.lock:
            if id in self.threads:
                self.threads[id]['status'] = status
                self.threads[id]['progress'] = progress
        with DQXDbTools.DBCursor() as cur:
            status = cap(status,250)
            # status = pymonetdb.sql.escape_string(status)
            # status = status.encode('ascii','ignore')
            sqlstring = "UPDATE calculations SET status=%s, progress=%s WHERE id=%s" #.format(id, status, progress)
            cur.execute(sqlstring, (status, progress, id))
            cur.commit()

    def SetName(self, id, name):
        with DQXDbTools.DBCursor() as cur:
            sqlstring = "UPDATE calculations SET name='{1}' WHERE id='{0}'".format(id, name)
            cur.execute(sqlstring)
            cur.commit()

    def SetScope(self, id, scope):
        with DQXDbTools.DBCursor() as cur:
            sqlstring = "UPDATE calculations SET scope='{1}' WHERE id='{0}'".format(id, scope)
            cur.execute(sqlstring)
            cur.commit()

    def SetFailed(self, id):
        with self.lock:
            if id in self.threads:
                self.threads[id]['failed'] = True
        with DQXDbTools.DBCursor() as cur:
            sqlstring = "UPDATE calculations SET failed=1 WHERE id='{0}'".format(id)
            cur.execute(sqlstring)
            cur.commit()

    def GetInfo(self,id):
        with DQXDbTools.DBCursor() as cur:
            cur.execute("SELECT status, progress, failed, completed FROM calculations WHERE id='{0}'".format(id))
            rs = cur.fetchone()
            if rs is None:
                return None
            return {
                'status': rs[0],
                'progress': rs[1],
                'failed': rs[2],
                'completed': rs[3]
            }

        # with self.lock:
        #     if id in self.threads:
        #         return { 'status': self.threads[id]['status'], 'progress': self.threads[id]['progress'], 'failed': self.threads[id]['failed'], 'completed': False }
        #     else:
        #         return None

theCalculationThreadList = CalculationThreadList()

def full_stack():
    import traceback, sys
    exc = sys.exc_info()[0]
    stack = traceback.extract_stack()[:-1]  # last one would be full_stack()
    if not exc is None:  # i.e. if an exception is present
        del stack[-1]       # remove call of full_stack, the printed exception
                            # will contain the caught exception caller instead
    trc = 'Traceback (most recent call last):\n'
    stackstr = trc + ''.join(traceback.format_list(stack))
    if not exc is None:
         stackstr += '  ' + traceback.format_exc().lstrip(trc)
    return stackstr

class CalculationThread (threading.Thread):
    def __init__(self, id, handler, data, calculationname):
        threading.Thread.__init__(self)
        if id == '':
            id = 'WR'+str(uuid.uuid1()).replace('-', '_')
        self.id = id
        self.calculationname = calculationname
        self.handler = handler
        self.data = data
        self.logfilename = None
        self.orig_stdout = sys.stdout
        self.orig_stderr = sys.stderr
        self.credentialInfo = DQXDbTools.CredentialInformation(data)
        self.logging_lock = threading.Lock()


    def OpenLog(self):
        self.logfilename = os.path.join(config.BASEDIR, 'temp', 'log_'+self.id)
        sys.stdout = self
        sys.stderr = self
        with open(self.logfilename, 'w') as logfile:
            logfile.write('Log start\n')

    def CloseLog(self):
        sys.stdout = self.orig_stdout
        sys.stderr = self.orig_stderr
        self.logfilename = None

    def fail(self, errormessage):
        theCalculationThreadList.SetFailed(self.id)
        theCalculationThreadList.SetInfo(self.id, 'Error: '+errormessage, None)
        print('ERROR:'+errormessage)
        self.CloseLog()

    def run(self):
        theCalculationThreadList.AddThread(self.id, self.calculationname, self.credentialInfo.userid)
        self.OpenLog()
        try:
            self.handler(self.data, self)
            theCalculationThreadList.DelThread(self.id)
        except Exception as e:
            theCalculationThreadList.SetFailed(self.id)
            theCalculationThreadList.SetInfo(self.id, 'Error: '+str(e), None)
            print('ERROR:'+str(e))
            print(full_stack())
        print("--- Closing log ---")
        self.CloseLog()

    def write(self, line):
        if line[0:3] == '@@@': # These are logs from normal operation, not from import
            self.orig_stdout.write(line)
            return
        with self.logging_lock:
            if self.logfilename is None:
                self.orig_stdout.write(line)
            else:
                with open(self.logfilename, 'a') as logfile:
                    logfile.write(line)


    def Log(self, content):
        content = str(content)
        if self.logfilename is None:
            print(content)
        else:
            self.write(content+'\n')

    def LogHeader(self, title):
        theCalculationThreadList.SetInfo(self.id, title, None)
        return CalcLogHeader(self, title)

    def LogSubHeader(self, title):
        return CalcLogSubHeader(self, title)

    def LogDataDump(self):
        return CalcLogDataDump(self)

    def SetInfo(self, status, progress=None):
        logentry = status
        if progress is not None:
            logentry += ' '+str(round(progress*100.0,1)) + '%'
        print(logentry)
        theCalculationThreadList.SetInfo(self.id, status, progress)

    def SetName(self, name):
        theCalculationThreadList.SetName(self.id, name)

    def SetScope(self, scope):
        theCalculationThreadList.SetScope(self.id, scope)

    def LogSQLCommand(self, cmd):
        print('SQL:'+cmd)

    def LogFileTop(self, filename, maxlinecount=5):
        if not os.path.exists(filename):
            self.Log('ERROR:Unable to find file '+filename)
        self.Log('Top lines of '+filename)
        with self.LogDataDump():
            with open(filename) as fp:
                ct = 0
                for line in fp:
                    line = line.rstrip('\r\n')
                    if len(line) > 100:
                        line = line[:100]+'...';
                    self.Log(line)
                    ct += 1
                    if ct >= maxlinecount:
                        break


    def RunPythonScript(self, scriptFile, runPath, arguments):
        with self.LogSubHeader('Python script'):
            print('Run path: '+runPath)
            os.chdir(runPath)
            cmd = config.pythoncommand + ' ' + scriptFile + ' ' + ' '.join(["'" + str(a) + "'" for a in arguments])
            if self.logfilename is not None:
                cmd += ' >> ' + self.logfilename + ' 2>&1'
            print('COMMAND:'+cmd)
            retval = os.system(cmd)
            if retval != 0:
                raise Exception('An error occurred while running subprocess (return value: {0}) '.format(retval)+cmd)

class CalcLogHeader:
    def __init__(self, calcObject, title):
        self.calcObject = calcObject
        self.title = title
        self.calcObject.Log('==>' + self.title)
        self.timer = DQXUtils.Timer()
    def __enter__(self):
        return None
    def __exit__(self, type, value, traceback):
        if value is None:
            self.calcObject.Log('<==Finished {0} (Elapsed: {1:.1f}s)'.format(self.title, self.timer.Elapsed()))


class CalcLogSubHeader:
    def __init__(self, calcObject, title):
        self.calcObject = calcObject
        self.title = title
        self.calcObject.Log('-->' + self.title)
        self.timer = DQXUtils.Timer()
    def __enter__(self):
        return None
    def __exit__(self, type, value, traceback):
        if value is None:
            self.calcObject.Log('<--Finished {0} (Elapsed: {1:.1f}s)'.format(self.title, self.timer.Elapsed()))

class CalcLogDataDump:
    def __init__(self, calcObject):
        self.calcObject = calcObject
        self.calcObject.Log('DD>')
    def __enter__(self):
        return None
    def __exit__(self, type, value, traceback):
        if value is None:
            self.calcObject.Log('<DD')


def GetCalculationInfo(id):
    return theCalculationThreadList.GetInfo(id)


def RespondAsync(handler, data, calculationname):
    id = 'WR'+str(uuid.uuid1()).replace('-', '_')
    data['calculationid'] = id
    thread = CalculationThread(id, handler, data, calculationname)
    thread.start()
    return data
