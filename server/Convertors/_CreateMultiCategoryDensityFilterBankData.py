from __future__ import print_function
from __future__ import absolute_import
# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
from builtins import range
from builtins import object
import math
import os
import simplejson
import sys
import math

from . import DQXEncoder

basedir = '.'

#============= FAKE STUFF FOR DEBUGGING; REMOVE FOR PRODUCTION ==============
# if False:
#     basedir = '/Users/pvaut/Documents/Genome/SummaryTracks/Samples_and_Variants/Extra1'
#     sys.argv = ['', 'Extra1', '20', '2', '50000', 'A;B']
#============= END OF FAKE STUFF ============================================


if len(sys.argv)<6:
    print('Usage: COMMAND datafile blockSizeStart blockSizeIncrFactor blockSizeMax, Categories (; separated) maxrowcount')
    print('   datafile: format: chromosome\\tposition\\tvalue (no header)')
    sys.exit()

sourcefile = sys.argv[1]
blockSizeStart = int(sys.argv[2])
blockSizeIncrFactor = int(sys.argv[3])
blockSizeMax = int(sys.argv[4])
try:
    maxrowcount = int(sys.argv[6])
except:
    maxrowcount = -1


categories  = sys.argv[5].split(';')
print('Categories: ' + str(categories))
categorymap = {categories[i]:i for i in range(len(categories))}
otherCategoryNr = None
for i in range(len(categories)):
    if categories[i] == '_other_':
        otherCategoryNr = i

class Level(object):
    def __init(self):
        self.blocksize = None
        self.currentblockend = 0
        self.catcounts = [0] * len(categories)
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
            level.catcounts = [0] * len(categories)
            level.outputfile = open(self.outputFolder+'/Summ_'+self.chromosome+'_'+str(blocksize), 'w')
            self.levels.append(level)
            blocksize *= self.blockSizeIncrFactor
        print(str(self.levels))


    def Add(self, pos, val):
        if pos <= self.lastpos:
            raise Exception('Positions should be strictly ordered')
        for level in self.levels:
            while pos >= level.currentblockend:
                self.CloseCurrentBlock(level)
                self.StartNextBlock(level)
            if val in categorymap:
                level.catcounts[categorymap[val]] += 1
            else:
                if otherCategoryNr is not None:
                    level.catcounts[otherCategoryNr] += 1

    def CloseCurrentBlock(self, level):
        level.outputfile.write(self.encoder.perform(level.catcounts))


    def StartNextBlock(self, level):
        level.currentblockend += level.blocksize
        level.catcounts = [0] * len(categories)


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


encoderInfo = {"ID": "MultiCatCount", 'CatCount': len(categories), 'EncoderLen': 4, 'Categories':categories }
encoder = DQXEncoder.GetEncoder(encoderInfo)


propid=sourcefile

cnf={}

cnf["BlockSizeStart"] = blockSizeStart
cnf["BlockSizeIncrFactor"] = blockSizeIncrFactor
cnf["BlockSizeMax"] = blockSizeMax

cnf["Properties"] = [
	{ "ID": propid, "Type": "Text"}
]

cnf["Summarisers"] = [
    {
        "PropID": propid,
        "IDExt": "cats",
        "Method": "MultiCatCount",
        "Encoder": encoderInfo
    }
]

fp = open(basedir+'/Summ.cnf', 'w')
simplejson.dump(cnf, fp, indent=True)
fp.write('\n')
fp.close()

#sys.exit()


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
        if linecount % 2000000 == 0:
            print(str(linecount))
    if (maxrowcount > 0) and (linecount > maxrowcount):
        break
    comps = line.split('\t')
    chromosome = comps[0]
    pos = int(float(comps[1]))
    val = comps[2]
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

print(str(linecount))
