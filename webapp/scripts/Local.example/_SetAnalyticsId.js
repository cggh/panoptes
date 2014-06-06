// This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
googleAnalyticsId="UA-38243754-1";
localhost=true;

function setAnalyticsOptions(localhost, gaq) {
	if (localhost) {
  		gaq.push(['_setDomainName', 'none']);
  		gaq.push(['_setAllowLinker', true]);   
	}
}
