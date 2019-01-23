from __future__ import print_function
# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
from builtins import range
from builtins import object
from DQXTableUtils import VTTable
import sys

class GFFParser(object):
    def __init__(self):
        self.targetfeaturelist=['gene', 'pseudogene']
        self.features=[]
        self.exonid='CDS'

    def GetParentFeature(self,feat):
        parentid=feat['parentid']
        if len(parentid)==0:
            return None
        key=feat['seqid']+parentid
        if not(key in self.featindex):
            return None
        idx=self.featindex[key]
        #print(idx)
        return self.features[idx]

#     def parseGTF(self,filelist):
#         #read the feature list
#         self.features=[]
#         self.featindex={}
#         for filename in filelist:
#             print('processing file '+filename)
#             f=open(filename,'r')
#             for line in f.readlines():
# #                if len(self.features)>20000: break#!!!
#                 line=line.rstrip('\n')
#                 if line[0]!='#':
#                     parts=line.split('\t')
#                     feattype=parts[2]
#                     if (feattype=='CDS') or (feattype==self.exonid):
#                         if len(self.features)%1000==0: print('read: '+str(len(self.features)))
#                         feat={}
#                         feat['nr']=len(self.features)
#                         feat['children']=[]
#                         feat['seqid']='chr'+parts[0]
#                         feat['type']=feattype
#                         feat['start']=int(parts[3])
#                         feat['end']=int(parts[4])
#                         attribs=parts[8].split(';')
#                         feat['id']=''
#                         feat['parentid']=''
#                         feat['name']=''
#                         for attribstr in attribs:
#                             attribstr=attribstr.lstrip()
#                             attribstr=attribstr.rstrip()
#                             #                            prt=attribstr.partition(' "')
#                             key,sp,value=attribstr.partition(' "')
#                             value=value[:-1]
#                             if feattype == 'CDS':
#                                 if key == 'gene_id':
#                                     feat['id'] = value
#                                 if key == 'gene_name':
#                                     feat['name'] += ' '+value
#                                 if key == 'description':
#                                     feat['name'] += ' '+value
#                                 if key == 'Alias':
#                                     print('alias: '+value)
#                                 feat['type'] = 'gene'
#                             else:
#                                 if key == 'gene_id':
#                                     feat['parentid'] = value
#                         self.features.append(feat)
#             f.close()

    def parseGFF(self,filelist):
        #read the feature list
        self.features=[]
        tokenMap = {}
        for filename in filelist:
            print('processing file '+filename)
            annotationreading=False
            f=open(filename,'r')
            for line in f.readlines():
                line=line.rstrip('\n')
                if line=='##gff-version 3' or line=='##gff-version\t3':
                    annotationreading=True
                if line=='##FASTA':
                    annotationreading=False
                if line[0]=='#':
                    print(line)
                if (line[0]!='#') and (annotationreading):
                    parts=line.split('\t')
                    feat={}
                    feat['children']=[]
                    feat['seqid']=parts[0]
                    feat['type']=parts[2]
                    feat['start']=int(parts[3])
                    feat['end']=int(parts[4])
                    attribs=parts[8].split(';')
                    feat['id']=''
                    feat['parentid']=''
                    feat['name'] = ''
                    feat['names'] = ''
                    feat['descr'] = feat['type']
                    for attribstr in attribs:
                        if '=' in attribstr:
                            key, value = attribstr.split('=')
                            tokenMap[key] = ''
                            if key == 'ID':
                                feat['id'] = value
                            if key == 'Parent':
                                feat['parentid'] = value
                            if key == 'Name':
                                feat['name'] += value
                                feat['names'] += value
                            if key == 'description':
                                feat['descr'] = value
                            if key == 'Alias':
                                if len(feat['names']) > 0:
                                    feat['names'] +=','
                                feat['names'] += value
                            if key =='previous_systematic_id':
                                if len(feat['names']) > 0:
                                    feat['names'] +=','
                                feat['names'] += value
                    if len(feat['names']) > 200:
                        feat['names'] = feat['names'][0:195]+'...'
                    if len(feat['descr']) > 200:
                        feat['descr'] = feat['descr'][0:195]+'...'
                    self.features.append(feat)
            f.close()
            print('Tokens found: ' + ','.join([key for key in tokenMap]))

    def Process(self):

        #remove duplicates
        print('removing duplicates')
        dind={}
        featnr=0
        while featnr<len(self.features):
            feat=self.features[featnr]
            key=feat['seqid']+feat['id']
            if (feat['type']==self.targetfeaturelist) and (key in dind):
                origfeat=self.features[dind[key]]
                origfeat['start']=min(origfeat['start'],feat['start'])
                origfeat['end']=max(origfeat['end'],feat['end'])
                self.features.pop(featnr)
            else:
                dind[key]=featnr
                featnr+=1

        print('building index')
        for i in range(len(self.features)):
            self.features[i]['nr']=i
            #Build an index
        self.featindex={}
        for feat in self.features:
            if feat['id'] in self.featindex:
                raise Exception('Duplicate feature')
            self.featindex[feat['seqid']+feat['id']]=feat['nr']

        #extending genes with exon regions
        print('extending')
        for feat in self.features:
            myfeat=feat
            if myfeat['type']==self.exonid:
                parentfeat=self.GetParentFeature(myfeat)
                if parentfeat!=None:
                    if parentfeat['end']<feat['end']:
                        print('Right extending {0} from {1} to {2}'.format(parentfeat['id'],parentfeat['end'],feat['end']))
                        parentfeat['end']=feat['end']
                    if parentfeat['start']>feat['start']:
                        print('Left extending {0} from {1} to {2}'.format(parentfeat['id'],parentfeat['start'],feat['start']))
                        parentfeat['start']=feat['start']



        #collect children of each feature
        for feat in self.features:
            myfeat=feat
            while self.GetParentFeature(myfeat)!=None:
                myparent=self.GetParentFeature(myfeat)
                myparent['children'].append(feat)
                myfeat=myparent
            myparent=self.GetParentFeature(feat)


    def save(self,filename):
        print('saving')
        typemap={}
        f=open(filename,'w')
        f.write('chromid\tfstart\tfstop\tfid\tfparentid\tftype\tfname\tfnames\tdescr\n')
        for feat in self.features:
            if not(feat['type'] in typemap):
                typemap[feat['type']]=0
            typemap[feat['type']]+=1
            if (feat['type'] in self.targetfeaturelist):
                f.write(feat['seqid']+'\t')
                f.write(str(feat['start'])+'\t')
                f.write(str(feat['end'])+'\t')
                f.write(feat['id']+'\t')
                f.write(''+'\t')
                f.write(feat['type']+'\t')
                f.write(feat['name']+'\t')
                f.write(feat['names']+'\t')
                f.write(feat['descr'])
                f.write('\n')
                for child in feat['children']:
                    if child['type']==self.exonid:
                        f.write(child['seqid']+'\t')
                        f.write(str(child['start'])+'\t')
                        f.write(str(child['end'])+'\t')
                        f.write(child['id']+'\t')
                        f.write(feat['id']+'\t')
                        f.write(child['type']+'\t')
                        f.write(child['name']+'\t\t\t')
                        f.write('\n')
        f.close()
        print(str(typemap))



#chromlist=range(1,15)
#basepath="C:/Data/Genomes/Plasmodium"
#filelist=['{0}/Pf3D7_{1}.gff'.format(basepath,str(nr).zfill(2)) for nr in chromlist]
#parser=GFFParser()
#parser.parseGFF(filelist)
#parser.Process()
#parser.save('{0}/features.txt'.format(basepath))


# basepath="C:/Data/Genomes/Plasmodium/Version3"
# filelist=['{0}/Pf3D7_v3.gff'.format(basepath)]
# parser=GFFParser()
# parser.targetfeaturelist=['repeat_region','pseudogene','snRNA','tRNA','centromere','pseudogenic_exon','pseudogenic_transcript','rRNA','snoRNA','polypeptide_motif','ncRNA']
# parser.parseGFF(filelist)
# parser.Process()
# parser.save('{0}/features.txt'.format(basepath))

basepath = '.'

#============= FAKE STUFF FOR DEBUGGING; REMOVE FOR PRODUCTION ==============
if False:
    basepath = '/home/pvaut/Documents/Genome/SourceData/datasets/PfCrosses/refgenome'
    sys.argv = ['', 'annotation.gff']
#============= END OF FAKE STUFF ============================================


if len(sys.argv)<2:
    print('Usage: COMMAND GFFFileName')
    sys.exit()

sourcefile = sys.argv[1]


filelist=['{0}/{1}'.format(basepath,sourcefile)]
parser=GFFParser()
#parser.targetfeaturelist=['gene','mRNA']
#parser.targetfeaturelist=['repeat_region','pseudogene','snRNA','tRNA','centromere','pseudogenic_exon','pseudogenic_transcript','rRNA','snoRNA','polypeptide_motif','ncRNA']
parser.parseGFF(filelist)
parser.Process()
parser.save('{0}/annotation.txt'.format(basepath))

tb = VTTable.VTTable()
tb.allColumnsText = True
tb.LoadFile(basepath+'/annotation.txt')
tb.ConvertColToValue('fstart')
tb.ConvertColToValue('fstop')
#tb.CalcCol('fnames', lambda x: x, 'fname')
#tb.CalcCol('descr', lambda: '')
#tb.CalcCol('strand', lambda: '')
print('DD>')
tb.PrintRows(0,10)
print('<DD')
tb.SaveSQLCreation(basepath+'/annotation_create.sql','annotation')
tb.SaveSQLDump(basepath+'/annotation_dump.sql','annotation')
