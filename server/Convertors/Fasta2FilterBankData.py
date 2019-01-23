from __future__ import print_function
# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
from builtins import object
import sys
import os
import simplejson

basedir = '.'
maxbasecount = -1

#============= FAKE STUFF FOR DEBUGGING; REMOVE FOR PRODUCTION ==============
if False:
    basedir = '/home/pvaut/Documents/Genome/SourceData/datasets/PGV_301/refgenome'
    sys.argv = ['', 'refsequence.fa']
#============= END OF FAKE STUFF ============================================

if len(sys.argv) < 3:
    print('Usage: COMMAND maxbasecount Sourcefilename')
    print('   Sourcefilename= fasta file')
    sys.exit()


input_maxbasecount = sys.argv[1]
if input_maxbasecount != 'all':
    maxbasecount = int(input_maxbasecount)


sourcefilename = sys.argv[2]

blockSizeStart = 1
blockSizeIncrFactor = 2
blockSizeMax = 40000




class Summariser(object):
    def __init__(self, chromosome, blockSizeStart, blockSizeIncrFactor, blockSizeMax, outputFolder):
        print('Chrom '+chromosome)
        self.chromosome = chromosome
        self.outputFolder = outputFolder
        self.lastpos=-1
        self.blockSizeStart = blockSizeStart
        self.blockSizeIncrFactor = blockSizeIncrFactor
        self.blockSizeMax = blockSizeMax
        self.levels = []
        blocksize = self.blockSizeStart
        while blocksize <= self.blockSizeMax:
            level = { 'blocksize':blocksize, 'currentblockend':blocksize }
            level['counts'] = {'A':0, 'C':0, 'G':0, 'T':0}
            level['outputfile'] = open(self.outputFolder+'/Summ_'+self.chromosome+'_'+str(blocksize), 'w')
            self.levels.append(level)
            blocksize *= self.blockSizeIncrFactor
        # print(str(self.levels))
        self.pos = 0


    def Add(self, val):
        for level in self.levels:
            while self.pos>=level['currentblockend']:
                self.CloseCurrentBlock(level)
                self.StartNextBlock(level)
            if val in level['counts']:
                level['counts'][val] += 1
        self.pos += 1

    def CloseCurrentBlock(self, level):
        maxcount = 0
        maxbase = 'N'
        for base in ['A', 'C', 'G', 'T']:
            if level['counts'][base]>maxcount:
                maxcount = level['counts'][base]
                maxbase = base
        level['outputfile'].write(maxbase)


    def StartNextBlock(self, level):
        level['currentblockend'] += level['blocksize']
        level['counts'] = {'A':0, 'C':0, 'G':0, 'T':0}


    def Finalise(self):
        for level in self.levels:
            self.CloseCurrentBlock(level)
            level['outputfile'].close()


cnf={}

cnf["BlockSizeStart"] = 1
cnf["BlockSizeIncrFactor"] = 2
cnf["BlockSizeMax"] = blockSizeMax

cnf["Properties"] = [
	{ "ID": "Base", "Type": "String"}
]

cnf["Summarisers"] = [
    {
        "PropID": "Base",
        "IDExt": "avg",
        "Method": "MostFrequent",
        "Encoder": {
            "ID": "FixedString",
            "Len": 1
        }
    }
]

fp = open(basedir+'/Summ.cnf','w')
simplejson.dump(cnf,fp,indent=True)
fp.write('\n')
fp.close()




#create output directory if necessary
outputdir=os.path.join(basedir,'Summaries')
if not os.path.exists(outputdir):
    os.makedirs(outputdir)

#remove all summary files that correspond to this configuration
for filename in os.listdir(outputdir):
    if filename.startswith('Summ_'):
        os.remove(os.path.join(outputdir,filename))



ifile=open(basedir+'/'+sourcefilename,'r')

chromoname=''
summariser = None

basect = 0
while True:
    line=ifile.readline()
    if not(line):
        break
    line=line.rstrip('\n')
    if line[0]=='>':
        chromoname=line[1:].split(' ')[0]
        if summariser != None:
            summariser.Finalise()
        summariser = Summariser(chromoname, blockSizeStart, blockSizeIncrFactor, blockSizeMax, outputdir)
        print('Reading chromosome {0}'.format(chromoname))
        posit=0
    else:
        for base in line:
            basect += 1
            if basect % 5000000 == 0:
                print(str(basect))
            summariser.Add(base.upper())
            if (maxbasecount > 0) and (basect > maxbasecount):
                break
    if (maxbasecount > 0) and (basect > maxbasecount):
        break

ifile.close()

if summariser != None:
    summariser.Finalise()
