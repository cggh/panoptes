

import math
import random


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
    return math.pow(c1['latt']-c2['latt'], 2.0) + math.pow(c1['long']-c2['long'], 2.0)

samplecount = 20000

fp = open('/Users/pvaut/Documents/SourceCode/WebApps/panoptes/sampledata/datasets/Geographic/datatables/samples/data', 'w')
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
            fp.write('{0}\t{1}\t{2}\t{3}\t{4}\n'.format(
                samplenr,
                cats[catnr],
                aggrcenter['name'],
                aggrcenter['long'],
                aggrcenter['latt']
            ))
            samplenr += 1


fp.close()