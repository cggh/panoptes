# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>



import math
import random
import datetime

smp_longit = []
smp_lattit = []
smp_cat = []
smp_reg = []
smp_numprop1 = []
smp_numprop2 = []
smp_data = []

cats = ['CAT01', 'CAT02', 'CAT03', 'CAT04']
catcount = len(cats)

centers = [
    { 'latt':20.055931, 'long':10.534178, 'cat':'CAT01', 'prevalence':0.7, 'sigma':4 },
    { 'latt':20.632784, 'long':24.858397, 'cat':'CAT02', 'prevalence':1.0, 'sigma':3 },
    { 'latt':10.740675, 'long':24.418944, 'cat':'CAT03', 'prevalence':0.7, 'sigma':4 },
    { 'latt':15.674847, 'long':16.04785, 'cat':'CAT04', 'prevalence':0.3, 'sigma':5 }
]

regioncenters = [
    { 'latt':29.840644, 'long':8.583981, 'cat':'REGA' },
    { 'latt':16.130262, 'long':44.912106, 'cat':'REGB' },
    { 'latt':7.013668, 'long':7.353512, 'cat':'REGC' },
    { 'latt':-2.284551, 'long':26.865231, 'cat':'REGD' },
    { 'latt':29.075375, 'long':36.181637, 'cat':'REGE' }
]

def coorddist(c1, c2):
    return math.sqrt(math.pow(c1['latt']-c2['latt'], 2.0) + math.pow(c1['long']-c2['long'], 2.0))

samplecount = 20000


samplenr = 0
while samplenr < samplecount:
    centernr = random.randint(0,len(centers)-1)
    if random.random()<centers[centernr]['prevalence']:
        center = centers[centernr]
        longit = center['long'] + random.gauss(0, center['sigma']*math.cos(center['latt']/180*math.pi))
        lattit = center['latt'] + random.gauss(0, center['sigma'])

        regionid = ''
        mindst = 1.0e9
        for region in regioncenters:
            dst = coorddist(region, {'long': longit, 'latt':lattit})
            if dst<mindst:
                mindst = dst
                regionid = region['cat']

        smp_longit.append(longit)
        smp_lattit.append(lattit)
        smp_cat.append(center['cat'])
        smp_reg.append(regionid)
        samplenr += 1

# add some aggregate site data

samplecount += 5000

aggrcenters = [
    { 'latt':-2.811371, 'long':17.578125, 'name':'REGF', 'prevalence':0.7, 'catprobs':[0.8, 0.15, 0.2, 0] },
    { 'latt':-10.919618, 'long':25.751953, 'name':'REGG', 'prevalence':0.2, 'catprobs':[0.3, 0.5, 0.1, 0.1] },
    { 'latt':-16.804541, 'long':22.412109, 'name':'REGH', 'prevalence':0.5, 'catprobs':[0.4, 0.2, 0.2, 0.2] },
    { 'latt':-16.804541, 'long':31.025391, 'name':'REGI', 'prevalence':0.2, 'catprobs':[0.0, 0.0, 0.1, 0.9] },
    { 'latt':-25.562265, 'long':24.082031, 'name':'REGJ', 'prevalence':0.1, 'catprobs':[0.1, 0.1, 0.7, 0.1] }
]

while samplenr < samplecount:
    centernr = random.randint(0, len(aggrcenters)-1)
    aggrcenter = aggrcenters[centernr]
    if random.random() < aggrcenter['prevalence']:
        catnr = random.randint(0,catcount-1)
        if random.random()<aggrcenter['catprobs'][catnr]:
            smp_longit.append(aggrcenter['long'])
            smp_lattit.append(aggrcenter['latt'])
            smp_cat.append(cats[catnr])
            smp_reg.append(aggrcenter['name'])
            samplenr += 1


for nr in range(samplenr):
    coord = {'long': smp_longit[nr], 'latt': smp_lattit[nr]}
    prop1 = coorddist(coord, {'long': 32, 'latt': 7})/50.0
    prop2 = coorddist(coord, {'long': 12, 'latt': 30})/500.0 + coorddist(coord, {'long': 20, 'latt': -11})/500.0
    smp_numprop1.append(prop1 + random.gauss(0,2))
    smp_numprop2.append(prop2 + random.gauss(0,2))
    day = int(round(coorddist(coord, {'long': 0, 'latt': 70})*10 + random.gauss(0,40), 0))
    date = datetime.datetime(2014,1,1) + datetime.timedelta(day)
    smp_data.append(date.isoformat()[0:10])


#basedir = '/home/pvaut/WebstormProjects/panoptes/sampledata'
basedir = '/Users/pvaut/Documents/SourceCode/WebApps/panoptes/sampledata'

fp = open(basedir + '/datasets/Geographic/datatables/samples/data', 'w')
fp.write('ID\tCatId\tRegionId\tLongitude\tLatitude\tNumProp1\tNumProp2\tCollectionDate\n')
for nr in range(samplenr):
    fp.write('{0}\t{1}\t{2}\t{3}\t{4}\t{5}\t{6}\t{7}\n'.format(
        str(nr).zfill(9),
        smp_cat[nr],
        smp_reg[nr],
        smp_longit[nr],
        smp_lattit[nr],
        smp_numprop1[nr],
        smp_numprop2[nr],
        smp_data[nr]
    ))

fp.close()