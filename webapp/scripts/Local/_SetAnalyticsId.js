googleAnalyticsId="UA-38243754-1";
localhost=true;

function setAnalyticsOptions(localhost, gaq) {
	if (localhost) {
  		gaq.push(['_setDomainName', 'none']);
  		gaq.push(['_setAllowLinker', true]);   
	}
}
