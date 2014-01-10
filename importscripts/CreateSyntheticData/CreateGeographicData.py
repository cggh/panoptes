

import math
import random


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
    return math.pow(c1['latt']-c2['latt'], 2.0) + math.pow(c1['long']-c2['long'], 2.0)

samplecount = 2000

fp = open('/home/pvaut/WebstormProjects/panoptes/sampledata/datasets/Geographic/datatables/samples/data', 'w')
fp.write('ID	CatId	RegionId	Longitude	Lattitude\n')

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

        fp.write('{0}\t{1}\t{2}\t{3}\t{4}\n'.format(
            samplenr,
            center['cat'],
            regionid,
            longit,
            lattit
        ))
        samplenr += 1

fp.close()