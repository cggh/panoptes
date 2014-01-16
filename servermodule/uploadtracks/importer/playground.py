import numpy
import scipy.cluster.hierarchy as hier
import scipy.spatial.distance as dist
import random
import fastcluster


samplecount = 2000
propcount = 30

dataMatrix = []

for samplenr in range(samplecount):
    row =[ random.random() for i in range(propcount) ]
    dataMatrix.append(row)
print('matrix created')


data = numpy.array(dataMatrix)
print('numpy converted')

#calculate a distance matrix
distMatrix = dist.pdist(data)
print('distances calculated')

#convert the distance matrix to square form. The distance matrix
#calculated above contains no redundancies, you want a square form
#matrix where the data is mirrored across the diagonal.
distSquareMatrix = dist.squareform(distMatrix)
print('squared done')

print('dtype= '+str(distSquareMatrix.dtype))

#calculate the linkage matrix
linkageMatrix = fastcluster.linkage(distSquareMatrix, method='single', preserve_input=False)
print('linkage done')

dendro = hier.dendrogram(linkageMatrix)
print('dendro done')

#get the order of rows according to the dendrogram
leaves = dendro['leaves']
print(str(leaves))

#print(str(linkageMatrix.tolist()))