# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

"""
File    quantile.py
Desc    computes sample quantiles
Author  Ernesto P. Adorio, PhD.
        UPDEPP (U.P. at Clarkfield)
Version 0.0.1 August 7. 2009
"""

from math import modf, floor

def quantile(x, q,  qtype = 7, issorted = False):
    """
    Args:
       x - input data
       q - quantile
       qtype - algorithm
       issorted- True if x already sorted.

    Compute quantiles from input array x given q.For median,
    specify q=0.5.

    References:
       http://reference.wolfram.com/mathematica/ref/Quantile.html
       http://wiki.r-project.org/rwiki/doku.php?id=rdoc:stats:quantile

    Author:
	Ernesto P.Adorio Ph.D.
	UP Extension Program in Pampanga, Clark Field.
    """
    if not issorted:
        y = sorted(x)
    else:
        y = x
    if not (1 <= qtype <= 9):
        return None  # error!

    # Parameters for the Hyndman and Fan algorithm
    abcd = [(0,   0, 1, 0), # inverse empirical distrib.function., R type 1
        (0.5, 0, 1, 0), # similar to type 1, averaged, R type 2
        (0.5, 0, 0, 0), # nearest order statistic,(SAS) R type 3

        (0,   0, 0, 1), # California linear interpolation, R type 4
        (0.5, 0, 0, 1), # hydrologists method, R type 5
        (0,   1, 0, 1), # mean-based estimate(Weibull method), (SPSS,Minitab), type 6
        (1,  -1, 0, 1), # mode-based method,(S, S-Plus), R type 7
        (1.0/3, 1.0/3, 0, 1), # median-unbiased ,  R type 8
        (3/8.0, 0.25, 0, 1)   # normal-unbiased, R type 9.
    ]

    a, b, c, d = abcd[qtype-1]
    n = len(x)
    g, j = modf( a + (n+b) * q -1)
    if j < 0:
        return y[0]
    elif j >= n:
        return y[n-1]   # oct. 8, 2010 y[n]???!! uncaught  off by 1 error!!!

    j = int(floor(j))
    if g ==  0:
        return y[j]
    else:
        return y[j] + (y[j+1]- y[j])* (c + d * g)
