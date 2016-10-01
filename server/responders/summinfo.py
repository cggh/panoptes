# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import config
import SummCreate

def response(returndata):
    dataid=returndata['dataid']
    blocksize=int(returndata['blocksize'])
    start=int(returndata['blockstart'])
    length=int(returndata['blockcount'])

    idcomps=returndata['ids'].split('~')
    components=[]
    for i in range(len(idcomps)/3):
        components.append({'folder':idcomps[3*i+0], 'config':idcomps[3*i+1], 'propid':idcomps[3*i+2]})

    #group components by common folder & config
    lastfolder=''
    lastconfig=''
    groupedcomponents={}
    for comp in components:
        key=comp['folder']+'_'+comp['config']
        if not(key in groupedcomponents):
            groupedcomponents[key]={'folder':comp['folder'], 'config':comp['config'], 'propids':[]}
        groupedcomponents[key]['propids'].append(comp['propid'])

    results={}
    for groupedcompkey in groupedcomponents:
        groupedcomp=groupedcomponents[groupedcompkey]
        creat=SummCreate.Creator(config.BASEDIR,groupedcomp['folder'],groupedcomp['config'])
        subresults=creat.GetData(dataid,blocksize,start,length,groupedcomp['propids'])
        results=dict(results, **subresults)


    returndata['results']=results

    return returndata
