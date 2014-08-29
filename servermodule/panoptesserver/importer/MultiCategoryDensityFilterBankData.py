import os
import sys
import simplejson
import DQXEncoder

class Level:
    def __init__(self, numCategories):
        self.blocksize = None
        self.currentblockend = 0
        self.catcounts = [0] * numCategories
        self.outputfile = None

    def __str__ (self):
        return ("sum %d, count %d, min %d, max %d" % (int(self.sum), int(self.count), int(self.min), int(self.max)))

class Summariser:
    def __init__(self, chromosome, propid, blockSizeStart, blockSizeIncrFactor, blockSizeMax, baseDir, categories):
        print('##### Start processing chromosome '+chromosome)
        
        self._chromosome = chromosome
        self._baseDir = baseDir
        self._lastpos=-1
        self._blockSizeStart = blockSizeStart
        self._blockSizeIncrFactor = blockSizeIncrFactor
        self._blockSizeMax = blockSizeMax
        self._field = propid
        
        print('Categories: ' + str(categories))
        self._categories = categories
        self._numCategories = len(categories)
        self._categorymap = {categories[i]:i for i in range(len(categories))}
        self._otherCategoryNr = None
        for i in range(len(categories)):
            if categories[i] == '_other_':
                self._otherCategoryNr = i
                
        self._setupSummary()
                
        self._levels = []
        blocksize = self._blockSizeStart
        while blocksize <= self._blockSizeMax:
            level = Level(self._numCategories)
            level.blocksize = blocksize
            level.currentblockend = blocksize
            level.catcounts = [0] * len(categories)
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
                    self.CloseCurrentBlock(level)
                    self.StartNextBlock(level)
                if val in self._categorymap:
                    level.catcounts[self._categorymap[val]] += 1
                else:
                    if self._otherCategoryNr is not None:
                        level.catcounts[self._otherCategoryNr] += 1

    def CloseCurrentBlock(self, level):
        level.outputfile.write(self._encoder.perform(level.catcounts))


    def StartNextBlock(self, level):
        level.currentblockend += level.blocksize
        level.catcounts = [0] * self._numCategories


    def Finalise(self):
        for level in self._levels:
            self.CloseCurrentBlock(level)
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
        
        
            encoderInfo = {"ID": "MultiCatCount", 'CatCount': self._numCategories, 'EncoderLen': 4, 'Categories':self._categories }
            self._encoder = DQXEncoder.GetEncoder(encoderInfo)
        
        
            propid= self._field
        
            cnf={}
        
            cnf["BlockSizeStart"] = self._blockSizeStart
            cnf["BlockSizeIncrFactor"] = self._blockSizeIncrFactor
            cnf["BlockSizeMax"] = self._blockSizeMax
            cnf["Properties"] = [
                { "ID": propid, "Type": "Float"}
            ]
        
            cnf["Summarisers"] = [
                {
                    "PropID": propid,
                    "IDExt": "cats",
                    "Method": "MultiCatCount",
                    "Encoder": encoderInfo
                }
            ]
        
            fp = open(basedir+'/Summ.cnf','w')
            simplejson.dump(cnf,fp,indent=True)
            fp.write('\n')
            fp.close()


if __name__ == "__main__":
    
    basedir = '.'
    
    #============= FAKE STUFF FOR DEBUGGING; REMOVE FOR PRODUCTION ==============
    # if False:
    #     basedir = '/Users/pvaut/Documents/Genome/SummaryTracks/Samples_and_Variants/Extra1'
    #     sys.argv = ['', 'Extra1', '20', '2', '50000', 'A;B']
    #============= END OF FAKE STUFF ============================================
    
    
    if len(sys.argv)<6:
        print('Usage: COMMAND datafile blockSizeStart blockSizeIncrFactor blockSizeMax, Categories (; separated)')
        print('   datafile: format: chromosome\\tposition\\tvalue (no header)')
        sys.exit()
    
    sourcefile = sys.argv[1]
    blockSizeStart = int(sys.argv[2])
    blockSizeIncrFactor = int(sys.argv[3])
    blockSizeMax = int(sys.argv[4])
    
    categories  = sys.argv[5].split(';')
    print('Categories: ' + str(categories))
    categorymap = {categories[i]:i for i in range(len(categories))}
    otherCategoryNr = None
    for i in range(len(categories)):
        if categories[i] == '_other_':
            otherCategoryNr = i
       
    propid=sourcefile.split('.')[0]
      
    sf = open(basedir+'/'+sourcefile,'r')
    
    currentChromosome = ''
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
        pos = int(float(comps[1]))
        val = comps[2]
        if chromosome != currentChromosome:
            if summariser != None:
                summariser.Finalise()
            summariser = Summariser(chromosome, blockSizeStart, blockSizeIncrFactor, blockSizeMax)
            if chromosome in processedChromosomes:
                raise Exception('File should be ordered by chromosome')
            processedChromosomes[chromosome] = True
            currentChromosome = chromosome
        summariser.Add(pos,val)
    
    
    if summariser != None:
        summariser.Finalise()
    
    print(str(linecount))
