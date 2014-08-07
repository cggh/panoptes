import os
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
    def __init__(self, chromosome, encoder, blockSizeStart, blockSizeIncrFactor, blockSizeMax, outputFolder, categories):
        print('##### Start processing chromosome '+chromosome)
        self.encoder = encoder
        self.chromosome = chromosome
        self.outputFolder = outputFolder
        self.lastpos=-1
        self.blockSizeStart = blockSizeStart
        self.blockSizeIncrFactor = blockSizeIncrFactor
        self.blockSizeMax = blockSizeMax
        
        print('Categories: ' + str(categories))
        self._numCategories = len(categories)
        self._categorymap = {categories[i]:i for i in range(len(categories))}
        self._otherCategoryNr = None
        for i in range(len(categories)):
            if categories[i] == '_other_':
                self._otherCategoryNr = i
                
        self.levels = []
        blocksize = self.blockSizeStart
        while blocksize <= self.blockSizeMax:
            level = Level(self._numCategories)
            level.blocksize = blocksize
            level.currentblockend = blocksize
            level.catcounts = [0] * len(categories)
            level.outputfile = open(self.outputFolder+'/Summ_'+self.chromosome+'_'+str(blocksize), 'w')
            self.levels.append(level)
            blocksize *= self.blockSizeIncrFactor
#        print(str(self.levels))




    def Add(self, pos, val):
        if val != None:
            if pos <= self.lastpos:
                raise Exception('Positions should be strictly ordered')
            for level in self.levels:
                while pos>=level.currentblockend:
                    self.CloseCurrentBlock(level)
                    self.StartNextBlock(level)
                if val in self._categorymap:
                    level.catcounts[self._categorymap[val]] += 1
                else:
                    if self._otherCategoryNr is not None:
                        level.catcounts[self._otherCategoryNr] += 1

    def CloseCurrentBlock(self, level):
        level.outputfile.write(self.encoder.perform(level.catcounts))


    def StartNextBlock(self, level):
        level.currentblockend += level.blocksize
        level.catcounts = [0] * self._numCategories


    def Finalise(self):
        for level in self.levels:
            self.CloseCurrentBlock(level)
            level.outputfile.close()


#Don't think this is quite right - at least some should be in the constructor
def SetupSummary(output):
    output["processedChromosomes"] = {}
    output["currentChromosome"] = ''
    output["summariser"] = None

    basedir = output['outputDir']
#create output directory if necessary
    outputdir=os.path.join(basedir,'Summaries')
    output["outputdir"] = outputdir
    if not os.path.exists(outputdir):
        os.makedirs(outputdir)

#remove all summary files that correspond to this configuration
    for filename in os.listdir(outputdir):
        if filename.startswith('Summ_'):
            os.remove(os.path.join(outputdir,filename))


    encoderInfo = {"ID": "MultiCatCount", 'CatCount': len(output["Categories"]), 'EncoderLen': 4, 'Categories':output["Categories"] }
    output["encoder"] = DQXEncoder.GetEncoder(encoderInfo)


    propid=output["propId"]

    cnf={}

    cnf["BlockSizeStart"] = output["blockSizeStart"]
    cnf["BlockSizeIncrFactor"] = output["blockSizeIncrFactor"]
    cnf["BlockSizeMax"] = output["blockSizeMax"]
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


