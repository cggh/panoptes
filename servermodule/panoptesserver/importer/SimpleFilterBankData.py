import os
import simplejson
import DQXEncoder
import sys

class Level:
    def __init__(self):
        self.blocksize = None
        self.currentblockend = 0
        self.sum = 0
        self.count = 0
        self.min = 1.0e99
        self.max = -1.0e99
        self.outputfile = None

    def __str__ (self):
        return ("sum %d, count %d, min %d, max %d" % (int(self.sum), int(self.count), int(self.min), int(self.max)))

class Summariser:
    def __init__(self, chromosome, propid, blockSizeStart, blockSizeIncrFactor, blockSizeMax, baseDir, maxVal):
        self._minval = 0
        
        self._chromosome = chromosome
        self._baseDir = baseDir
        self._lastpos=-1
        self._blockSizeStart = blockSizeStart
        self._blockSizeIncrFactor = blockSizeIncrFactor
        self._blockSizeMax = blockSizeMax
        self._maxval = maxVal
        self._levels = []
        self._field = propid
                
        self._setupSummary()
        
        blocksize = self._blockSizeStart
        while blocksize <= self._blockSizeMax:
            level = Level()
            level.blocksize = blocksize
            level.currentblockend = blocksize
            level.sum = 0
            level.count = 0
            level.min = 1.0e99
            level.max = -1.0e99
            level.outputfile = open(self._outputdir+'/Summ_'+self._chromosome+'_'+str(blocksize), 'w')
            self._levels.append(level)
            blocksize *= self._blockSizeIncrFactor
#        print(str(self.levels))


    def Add(self, pos, val):
        if val != None:
            if pos <= self._lastpos:
                raise Exception('Positions should be strictly ordered')
            for level in self._levels:
                while pos>=level.currentblockend:
                    self._closeCurrentBlock(level)
                    self.StartNextBlock(level)
                level.sum += val
                level.count += 1
                level.min = min(level.min, val)
                level.max = max(level.max, val)

    def _closeCurrentBlock(self, level):
        if level.count == 0:
            level.sum = None
            level.min = None
            level.max = None
        else:
            level.sum /= level.count
        level.outputfile.write('{0}{1}{2}'.format(
            self._encoder.perform(min(level.sum, self._maxval)),
            self._encoder.perform(min(level.min, self._maxval)),
            self._encoder.perform(min(level.max, self._maxval))
        ))


    def StartNextBlock(self, level):
        level.currentblockend += level.blocksize
        level.sum = 0
        level.count = 0
        level.min = 1.0e99
        level.max = -1.0e99


    def Finalise(self):
        for level in self._levels:
            self._closeCurrentBlock(level)
            level.outputfile.close()



    def _setupSummary(self):
        
        basedir = self._baseDir   
    #create output directory if necessary
        self._outputdir=os.path.join(basedir,'Summaries')
     
        if not os.path.exists(self._outputdir):
            os.makedirs(self._outputdir)
    
    #remove all summary files that correspond to this configuration
        for filename in os.listdir(self._outputdir):
            if filename.startswith('Summ_' + self._chromosome):
                os.remove(os.path.join(self._outputdir,filename))
    
    
        encoderInfo = {"ID":"Float2B64", "Len":2, "Min": self._minval, "Max": self._maxval}
        self._encoder = DQXEncoder.GetEncoder(encoderInfo)
    
        propid = self._field
        
        cnf={}
    
        cnf["BlockSizeStart"] = self._blockSizeStart
        cnf["BlockSizeIncrFactor"] = self._blockSizeIncrFactor
        cnf["BlockSizeMax"] = self._blockSizeMax
        cnf["Properties"] = [
            { "ID": propid, "Type": "Float"}
        ]
    
        cnf["Summarisers"] = [
            {
                "PropID":propid,
                "IDExt":"avg",
                "Method":"Average",
                "Encoder":encoderInfo
            },
            {
                "PropID":propid,
                "IDExt":"min",
                "Method":"Min",
                "Encoder":encoderInfo
            },
            {
                "PropID":propid,
                "IDExt":"max",
                "Method":"Max",
                "Encoder":encoderInfo
            }
        ]
    
        fp = open(basedir+'/Summ.cnf','w')
        simplejson.dump(cnf,fp,indent=True)
        fp.write('\n')
        fp.close()



if __name__ == "__main__":
    
    basedir = '.'
    
    #============= FAKE STUFF FOR DEBUGGING; REMOVE FOR PRODUCTION ==============
    if False:
        basedir = '/home/pvaut/Documents/Genome/SummaryTracks/pf21viewtracks/Uniqueness'
        sys.argv = ['', 'Uniqueness.txt', '0', '100', '5', '2', '100000']
    #============= END OF FAKE STUFF ============================================
    
    
    if len(sys.argv)<7:
        print('Usage: COMMAND datafile minval maxval blockSizeStart blockSizeIncrFactor blockSizeMax')
        print('   datafile: format: chromosome\\tposition\\tvalue (no header)')
        sys.exit()
    
    sourcefile = sys.argv[1]
    propid=sourcefile.split('.')[0]
    minval = float(sys.argv[2])
    maxval = float(sys.argv[3])
    blockSizeStart = int(sys.argv[4])
    blockSizeIncrFactor = int(sys.argv[5])
    blockSizeMax = int(sys.argv[6])

    sf = open(basedir+'/'+sourcefile,'r')
    
    currentChromosome=''
    summariser = None
    processedChromosomes = {}
    
    
    
    linecount = 0
    while True:
        line=sf.readline().rstrip('\n')
        if not(line):
            break
        else:
            linecount += 1
            if linecount % 500000 ==0:
                print(str(linecount))
        comps = line.split('\t')
        chromosome = comps[0]
        pos = int(comps[1])
        val = None
        try:
            val = float(comps[2])
        except:
            pass
        if chromosome != currentChromosome:
            if summariser != None:
                summariser.Finalise()
            print('##### Start processing chromosome '+chromosome)
            summariser = Summariser(propid, chromosome, blockSizeStart, blockSizeIncrFactor, blockSizeMax, basedir, maxval)
            if chromosome in processedChromosomes:
                raise Exception('File should be ordered by chromosome')
            processedChromosomes[chromosome] = True
            currentChromosome = chromosome
        summariser.Add(pos,val)
    
    
    if summariser != None:
        summariser.Finalise()
    
    print(str(linecount))
