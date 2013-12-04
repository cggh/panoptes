import threading
import uuid
import DQXDbTools
import DQXUtils
import datetime
import config
import os
import sys




class CalculationThreadList:
    def __init__(self):
        self.threads = {}
        self.lock = threading.Lock()

    def AddThread(self,id, calculationname):
        with self.lock:
            self.threads[id] = { 'status':'Calculating', 'progress':None, 'failed':False }
        db = DQXDbTools.OpenDatabase()
        cur = db.cursor()
        timestamp = str(datetime.datetime.now())[0:19]
        sqlstring = 'INSERT INTO calculations VALUES ("{0}", "UserX", "{1}", "{2}", "Calculating", 0, 0, 0, "")'.format(id, timestamp, calculationname)
        cur.execute(sqlstring)
        db.commit()
        db.close()


    def DelThread(self, id):
        with self.lock:
            del self.threads[id]
        db = DQXDbTools.OpenDatabase()
        cur = db.cursor()
        sqlstring = 'UPDATE calculations SET completed=1, status="Finished", progress=0 WHERE id="{0}"'.format(id)
        cur.execute(sqlstring)
        db.commit()
        db.close()

    def SetInfo(self, id, status, progress):
        if progress is None:
            progress = 0
        with self.lock:
            if id in self.threads:
                self.threads[id]['status'] = status
                self.threads[id]['progress'] = progress
        db = DQXDbTools.OpenDatabase()
        cur = db.cursor()
        status = status.replace('"','`')
        status = status.replace("'",'`')
        sqlstring = 'UPDATE calculations SET status="{1}", progress={2} WHERE id="{0}"'.format(id, status, progress)
        cur.execute(sqlstring)
        db.commit()
        db.close()

    def SetName(self, id, name):
        db = DQXDbTools.OpenDatabase()
        cur = db.cursor()
        sqlstring = 'UPDATE calculations SET name="{1}" WHERE id="{0}"'.format(id, name)
        cur.execute(sqlstring)
        db.commit()
        db.close()

    def SetScope(self, id, scope):
        db = DQXDbTools.OpenDatabase()
        cur = db.cursor()
        sqlstring = 'UPDATE calculations SET scope="{1}" WHERE id="{0}"'.format(id, scope)
        cur.execute(sqlstring)
        db.commit()
        db.close()

    def SetFailed(self, id):
        with self.lock:
            if id in self.threads:
                self.threads[id]['failed'] = True
        db = DQXDbTools.OpenDatabase()
        cur = db.cursor()
        sqlstring = 'UPDATE calculations SET failed=1 WHERE id="{0}"'.format(id)
        cur.execute(sqlstring)
        db.commit()
        db.close()

    def GetInfo(self,id):
        with self.lock:
            if id in self.threads:
                return { 'status': self.threads[id]['status'], 'progress': self.threads[id]['progress'], 'failed': self.threads[id]['failed'], 'completed': False }
            else:
                return None

theCalculationThreadList = CalculationThreadList()

class CalculationThread (threading.Thread):
    def __init__(self, id, handler, data, calculationname):
        threading.Thread.__init__(self)
        self.id = id
        self.calculationname = calculationname
        self.handler = handler
        self.data = data
        self.logfile = None
        self.orig_stdout = sys.stdout
        self.orig_stderr = sys.stderr
    def run(self):
        theCalculationThreadList.AddThread(self.id, self.calculationname)
        self.logfilename = os.path.join(config.BASEDIR, 'temp', 'log_'+self.id)
        self.logfile = open(self.logfilename, 'w')
        sys.stdout = self
        sys.stderr = self
        try:
            self.handler(self.data, self)
            theCalculationThreadList.DelThread(self.id)
        except Exception as e:
            theCalculationThreadList.SetFailed(self.id)
            theCalculationThreadList.SetInfo(self.id, 'Error: '+str(e), None)
            print('ERROR:'+str(e))
        print("--- Closing log ---")
        sys.stdout = self.orig_stdout
        sys.stderr = self.orig_stderr
        self.logfile.close()
        self.logfile = None

    def write(self, line):
        if self.logfile is None:
            self.orig_stdout.write(line)
        else:
            self.logfile.write(line)


    def Log(self, content):
        if self.logfile is None:
            raise Exception('Calculation log file is not open')
        self.logfile.write(content+'\n')

    def LogHeader(self, title):
        theCalculationThreadList.SetInfo(self.id, title, None)
        return CalcLogHeader(self, title)

    def SetInfo(self, status, progress=None):
        logentry = status
        if progress is not None:
            logentry += ' '+str(progress)
        print(logentry)
        theCalculationThreadList.SetInfo(self.id, status, progress)

    def SetName(self, name):
        theCalculationThreadList.SetName(self.id, name)

    def SetScope(self, scope):
        theCalculationThreadList.SetScope(self.id, scope)

    def LogSQLCommand(self, cmd):
        print('SQL:'+cmd)


    def RunPythonScript(self, scriptFile, runPath, arguments):
        os.chdir(runPath)
        cmd = config.pythoncommand + ' ' + scriptFile + ' ' + ' '.join([str(a) for a in arguments])
        cmd += ' >> ' + self.logfilename + ' 2>&1'
        print('COMMAND:'+cmd)
        self.logfile.close()
        self.logfile = None
        os.system(cmd)
        self.logfile = open(self.logfilename, 'a')

class CalcLogHeader:
    def __init__(self, calcObject, title):
        self.calcObject = calcObject
        self.title = title
        self.calcObject.Log('==>' + self.title)
        self.timer = DQXUtils.Timer()
    def __enter__(self):
        return None
    def __exit__(self, type, value, traceback):
        self.calcObject.Log('<==Finished {0} (Elapsed: {1:.1f}s)'.format(self.title, self.timer.Elapsed()))



def GetCalculationInfo(id):
    return theCalculationThreadList.GetInfo(id)


def RespondAsync(handler, data, calculationname):
    id = 'WR'+str(uuid.uuid1()).replace('-', '_')
    data['calculationid'] = id
    thread = CalculationThread(id, handler, data, calculationname)
    thread.start()
    return data