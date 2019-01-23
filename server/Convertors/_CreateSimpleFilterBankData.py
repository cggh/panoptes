from __future__ import print_function
from __future__ import absolute_import
# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
from builtins import object
import math
import os
import simplejson
import sys
import math

from . import DQXEncoder

basedir = '.'

#============= FAKE STUFF FOR DEBUGGING; REMOVE FOR PRODUCTION ==============
if False:
    basedir = '/home/pvaut/Documents/Genome/SummaryTracks/pf21viewtracks/Uniqueness'
    sys.argv = ['', 'Uniqueness.txt', '0', '100', '5', '2', '100000']
#============= END OF FAKE STUFF ============================================


if len(sys.argv)<8:
    print('Usage: COMMAND datafile minval maxval blockSizeStart blockSizeIncrFactor blockSizeMax maxrowcount')
    print('   datafile: format: chromosome\\tposition\\tvalue (no header)')
    sys.exit()

sourcefile = sys.argv[1]
minval = float(sys.argv[2])
maxval = float(sys.argv[3])
blockSizeStart = int(sys.argv[4])
blockSizeIncrFactor = int(sys.argv[5])
blockSizeMax = int(sys.argv[6])
maxrowcount = int(sys.argv[7])

class Level(object):
    def __init(self):
        self.blocksize = None
        self.currentblockend = 0
        self.sum = 0
        self.count = 0
        self.min = 1.0e99
        self.max = -1.0e99
        self.outputfile = None


class Summariser(object):
    def __init__(self, chromosome, encoder, blockSizeStart, blockSizeIncrFactor, blockSizeMax, outputFolder):
        print('Chrom '+chromosome)
        self.encoder = encoder
        self.chromosome = chromosome
        self.outputFolder = outputFolder
        self.lastpos=-1
        self.blockSizeStart = blockSizeStart
        self.blockSizeIncrFactor = blockSizeIncrFactor
        self.blockSizeMax = blockSizeMax
        self.levels = []
        blocksize = self.blockSizeStart
        while blocksize <= self.blockSizeMax:
            level = Level()
            level.blocksize = blocksize
            level.currentblockend = blocksize
            level.sum = 0
            level.count = 0
            level.min = 1.0e99
            level.max = -1.0e99
            level.outputfile = open(self.outputFolder+'/Summ_'+self.chromosome+'_'+str(blocksize), 'w')
            self.levels.append(level)
            blocksize *= self.blockSizeIncrFactor
        print(str(self.levels))


    def Add(self, pos, val):
        if val != None:
            if pos <= self.lastpos:
                raise Exception('Positions should be strictly ordered')
            for level in self.levels:
                while pos>=level.currentblockend:
                    self.CloseCurrentBlock(level)
                    self.StartNextBlock(level)
                level.sum += val
                level.count += 1
                level.min = min(level.min, val)
                level.max = max(level.max, val)

    def CloseCurrentBlock(self, level):
        if level.count == 0:
            level.sum = None
            level.min = None
            level.max = None
        else:
            level.sum /= level.count
        level.outputfile.write('{0}{1}{2}'.format(
            self.encoder.perform(min(level.sum, maxval)),
            self.encoder.perform(min(level.min, maxval)),
            self.encoder.perform(min(level.max, maxval))
        ))


    def StartNextBlock(self, level):
        level.currentblockend += level.blocksize
        level.sum = 0
        level.count = 0
        level.min = 1.0e99
        level.max = -1.0e99


    def Finalise(self):
        for level in self.levels:
            self.CloseCurrentBlock(level)
            level.outputfile.close()





#create output directory if necessary
outputdir=os.path.join(basedir,'Summaries')
if not os.path.exists(outputdir):
    os.makedirs(outputdir)

#remove all summary files that correspond to this configuration
for filename in os.listdir(outputdir):
    if filename.startswith('Summ_'):
        os.remove(os.path.join(outputdir,filename))


encoderInfo = {"ID":"Float2B64", "Len":2, "Min":minval, "Max":maxval}
encoder = DQXEncoder.GetEncoder(encoderInfo)


propid=sourcefile

cnf={}

cnf["BlockSizeStart"] = blockSizeStart
cnf["BlockSizeIncrFactor"] = blockSizeIncrFactor
cnf["BlockSizeMax"] = blockSizeMax

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

#sys.exit()


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
        if linecount % 2000000 == 0:
            print(str(linecount))
    if (maxrowcount > 0) and (linecount > maxrowcount):
        break
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
        summariser = Summariser(chromosome, encoder, blockSizeStart, blockSizeIncrFactor, blockSizeMax, outputdir)
        if chromosome in processedChromosomes:
            raise Exception('File should be ordered by chromosome')
        processedChromosomes[chromosome] = True
        currentChromosome = chromosome
    summariser.Add(pos,val)


if summariser != None:
    summariser.Finalise()

print('Lines processed: '+str(linecount))