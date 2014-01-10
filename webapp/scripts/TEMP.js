var map;
var points=[];
var pointsrand=[];
var areaDiv=document.getElementById('area');
var areaDivkm=document.getElementById('areakm');
var randomMarkers=new Array(0);
var routeMarkers=new Array(0);
var lines=[];
var lineColor='#ff0000';
var fillColor='#00FF00';
var lineWidth=4;
var polygon;
var routePath;
var routePath2;
var ShowHideONOFF=0;
var radiansPerDegree=Math.PI/180.0;
var degreesPerRadian=180.0/Math.PI;
var earthRadiusMeters=6367460.0;
var metersPerDegree=2.0*Math.PI*earthRadiusMeters/360.0;
var metersPerKm=1000.0;
var meters2PerHectare=10000.0;
var feetPerMeter=3.2808399;
var feetPerMile=5280.0;
var acresPerMile2=640;

function initialize()
{
    var latlng = new google.maps.LatLng(34.12016327332972,-118.0456525824976);
    var myOptions = {zoom:16,center:latlng,mapTypeId:google.maps.MapTypeId.HYBRID,draggableCursor:'crosshair',mapTypeControlOptions:{style:google.maps.MapTypeControlStyle.DROPDOWN_MENU}};
    map = new google.maps.Map(document.getElementById("map_canvas"),myOptions);
    google.maps.event.addListener(map, 'click', mapclick);

    areaDiv.innerHTML='0 m&sup2;';
    areaDivkm.innerHTML='0 km&sup2;';

    Display();

//delay by 200ms!
    setTimeout('Regen()', 200);
}

function Regen()
{
    var bounds = map.getBounds();
    var southWest = bounds.getSouthWest();
    var northEast = bounds.getNorthEast();
    var lngSpan = northEast.lng() - southWest.lng();
    var latSpan = northEast.lat() - southWest.lat();
    pointsrand=[];
    for (var i = 0; i < 100; i++)
    {
        var point = new google.maps.LatLng(southWest.lat() + latSpan * Math.random(),southWest.lng() + lngSpan * Math.random());
        pointsrand.push(point);
    }
}

function mapclick(event)
{
    points.push(event.latLng);
    ShowHideONOFF=0;
    Display();
}

function SearchPointsAdd()
{
    if (!(polygon==undefined))
    {
        if (randomMarkers)
        {
            for (i in randomMarkers)
            {
                randomMarkers[i].setMap(null);
            }
        }

        for(var i=0;i<pointsrand.length;++i)
        {
            if (polygon.containsLatLng(pointsrand[i]))
            {
                var marker=placeMarkerred(pointsrand[i],i);
                randomMarkers.push(marker);
                marker.setMap(map);
            }
        }
    }
}

function Display()
{
    if (routeMarkers)
    {
        for (i in routeMarkers)
        {
            routeMarkers[i].setMap(null);
        }
    }

    if (!(routePath==undefined))
    {
        routePath.setMap(null);
    }

    if (!(routePath2==undefined))
    {
        routePath2.setMap(null);
    }

    if (!(polygon==undefined))
    {
        polygon.setMap(null);
    }



    routePath = new google.maps.Polyline({
        path: points,
        strokeColor: lineColor,
        strokeOpacity: 1.0,
        strokeWeight: lineWidth,
        geodesic: true
    });
    routePath.setMap(map);

    if (points.length>2)
    {
        var points2 = [points[0],points[points.length-1]];

        routePath2 = new google.maps.Polyline({
            path: points2,
            strokeColor: lineColor,
            strokeOpacity: 1.0,
            strokeWeight: lineWidth,
            geodesic: true
        });
        routePath2.setMap(map);

        polygon = new google.maps.Polygon({
            paths: points,
            strokeColor: "#FF0000",
            strokeOpacity: 1,
            strokeWeight: 1,
            fillColor: fillColor,
            fillOpacity: 0.5
        });

        polygon.setMap(map);

        areaDiv.innerHTML='&nbsp;';
        areaDivkm.innerHTML='&nbsp;';
        var areaMeters2=SphericalPolygonAreaMeters2(points);
        if(areaMeters2<1000000.0)
            areaMeters2=PlanarPolygonAreaMeters2(points);
//update display for area
        areaDiv.innerHTML=Areas(areaMeters2);
        areaDivkm.innerHTML=Areaskm(areaMeters2);
    }

    lines=[];
    routeMarkers=new Array(0);

    for(var i=0;i<points.length;++i)
    {
        var marker=placeMarker(points[i],i);
        routeMarkers.push(marker);
        marker.setMap(map);
    }

    SearchPointsAdd();
}

function ClearAllPoints()
{

    if (randomMarkers)
    {
        for (i in randomMarkers)
        {
            randomMarkers[i].setMap(null);
        }
    }

    if (routeMarkers)
    {
        for (i in routeMarkers)
        {
            routeMarkers[i].setMap(null);
        }
    }

    if (!(routePath==undefined))
    {
        routePath.setMap(null);
    }

    if (!(routePath2==undefined))
    {
        routePath2.setMap(null);
    }

    if (!(polygon==undefined))
    {
        polygon.setMap(null);
    }

    routeMarkers=new Array(0);
    routePath=null;
    routePath2=null;
    polygon=null;
    points=[];
}

function DeleteLastPoint()
{
    if(points.length>0)
        points.length--;
    Display();
}

function placeMarker(location,number)
{
    var image = new google.maps.MarkerImage('http://www.daftlogic.com/images/gmmarkersv3/stripes.png',
// This marker is 20 pixels wide by 32 pixels tall.
        new google.maps.Size(20, 34),
// The origin for this image is 0,0.
        new google.maps.Point(0,0),
// The anchor for this image is the base of the flagpole at 0,32.
        new google.maps.Point(9, 33));
    var shadow = new google.maps.MarkerImage('http://www.daftlogic.com/images/gmmarkersv3/shadow.png',
// The shadow image is larger in the horizontal dimension
// while the position and offset are the same as for the main image.
        new google.maps.Size(28, 22),
        new google.maps.Point(0,0),
        new google.maps.Point(1, 22));

    var marker = new google.maps.Marker({position:location,map:map,shadow:shadow,icon:image,draggable:true});

    google.maps.event.addListener(marker, 'dragend', function(event)
    {
        points[number]=event.latLng;
        Display();
    });

    return marker;
}

function placeMarkerred(location,number)
{
    var image = new google.maps.MarkerImage('http://www.daftlogic.com/images/gmmarkersv3/marker.png',
// This marker is 20 pixels wide by 32 pixels tall.
        new google.maps.Size(20, 34),
// The origin for this image is 0,0.
        new google.maps.Point(0,0),
// The anchor for this image is the base of the flagpole at 0,32.
        new google.maps.Point(9, 33));
    var shadow = new google.maps.MarkerImage('http://www.daftlogic.com/images/gmmarkersv3/shadow.png',
// The shadow image is larger in the horizontal dimension
// while the position and offset are the same as for the main image.
        new google.maps.Size(28, 22),
        new google.maps.Point(0,0),
        new google.maps.Point(1, 22));

    var marker = new google.maps.Marker({position:location,map:map,shadow:shadow,icon:image,draggable:true});

    google.maps.event.addListener(marker, 'dragend', function(event)
    {
        points[number]=event.latLng;
        Display();
    });

    return marker;
}

function GreatCirclePoints(p1,p2)
{
    var maxDistanceMeters=200000.0;
    var ps=[];
    if(p1.distanceFrom(p2)<=maxDistanceMeters)
    {
        ps.push(p1);
        ps.push(p2);
    }
    else
    {
        var theta1=p1.lng()*radiansPerDegree;
        var phi1=(90.0-p1.lat())*radiansPerDegree;
        var x1=earthRadiusMeters*Math.cos(theta1)*Math.sin(phi1);
        var y1=earthRadiusMeters*Math.sin(theta1)*Math.sin(phi1);
        var z1=earthRadiusMeters*Math.cos(phi1);
        var theta2=p2.lng()*radiansPerDegree;
        var phi2=(90.0-p2.lat())*radiansPerDegree;
        var x2=earthRadiusMeters*Math.cos(theta2)*Math.sin(phi2);
        var y2=earthRadiusMeters*Math.sin(theta2)*Math.sin(phi2);
        var z2=earthRadiusMeters*Math.cos(phi2);
        var x3=(x1+x2)/2.0;
        var y3=(y1+y2)/2.0;
        var z3=(z1+z2)/2.0;
        var r3=Math.sqrt(x3*x3+y3*y3+z3*z3);
        var theta3=Math.atan2(y3,x3);
        var phi3=Math.acos(z3/r3);
        var p3=new GLatLng(90.0-phi3*degreesPerRadian,theta3*degreesPerRadian);
        var s1=GreatCirclePoints(p1,p3);
        var s2=GreatCirclePoints(p3,p2);
        for(var i=0;i<s1.length;++i)
            ps.push(s1[i]);
        for(var i=1;i<s2.length;++i)
            ps.push(s2[i]);
    }
    return ps;
}

function ShowHide()
{
    if (ShowHideONOFF==0)
    {
        ShowHideONOFF=1;
        for(var i=0;i<pointsrand.length;++i)
        {
            var marker=placeMarkerred(pointsrand[i],i);
            randomMarkers.push(marker);
            marker.setMap(map);
        }
    }
    else
    {
        ShowHideONOFF=0;
        for(var i=0;i<pointsrand.length;++i)
        {
            randomMarkers[i].setMap(null);
        }
        Display();

    }
}

function Areas(areaMeters2)
{
    var areaHectares=areaMeters2/meters2PerHectare;
    var areaKm2=areaMeters2/metersPerKm/metersPerKm;
    var areaFeet2=areaMeters2*feetPerMeter*feetPerMeter;
    var areaMiles2=areaFeet2/feetPerMile/feetPerMile;
    var areaAcres=areaMiles2*acresPerMile2;

    return areaMeters2+' m&sup2; ';
}

function Areaskm(areaMeters2)
{
    var areaHectares=areaMeters2/meters2PerHectare;
    var areaKm2=areaMeters2/metersPerKm/metersPerKm;
    var areaFeet2=areaMeters2*feetPerMeter*feetPerMeter;
    var areaMiles2=areaFeet2/feetPerMile/feetPerMile;
    var areaAcres=areaMiles2*acresPerMile2;

    return areaKm2+' km&sup2; ';
}



function SphericalPolygonAreaMeters2(points)
{
    var totalAngle=0.0;
    for(i=0;i<points.length;++i)
    {
        var j=(i+1)%points.length;
        var k=(i+2)%points.length;
        totalAngle+=Angle(points[i],points[j],points[k]);
    }
    var planarTotalAngle=(points.length-2)*180.0;
    var sphericalExcess=totalAngle-planarTotalAngle;
    if(sphericalExcess>420.0)
    {
        totalAngle=points.length*360.0-totalAngle;
        sphericalExcess=totalAngle-planarTotalAngle;
    }
    else if(sphericalExcess>300.0&&sphericalExcess<420.0)
    {
        sphericalExcess=Math.abs(360.0-sphericalExcess);
    }
    return sphericalExcess*radiansPerDegree*earthRadiusMeters*earthRadiusMeters;
}

function PlanarPolygonAreaMeters2(points)
{var a=0.0;
    for(var i=0;i<points.length;++i)
    {var j=(i+1)%points.length;
        var xi=points[i].lng()*metersPerDegree*Math.cos(points[i].lat()*radiansPerDegree);
        var yi=points[i].lat()*metersPerDegree;
        var xj=points[j].lng()*metersPerDegree*Math.cos(points[j].lat()*radiansPerDegree);
        var yj=points[j].lat()*metersPerDegree;
        a+=xi*yj-xj*yi;
    }
    return Math.abs(a/2.0);
}

function Angle(p1,p2,p3)
{
    var bearing21=Bearing(p2,p1);
    var bearing23=Bearing(p2,p3);
    var angle=bearing21-bearing23;
    if(angle<0.0)
        angle+=360.0;
    return angle;
}

function Bearing(from,to)
{
    var lat1=from.lat()*radiansPerDegree;
    var lon1=from.lng()*radiansPerDegree;
    var lat2=to.lat()*radiansPerDegree;
    var lon2=to.lng()*radiansPerDegree;
    var angle=-Math.atan2(Math.sin(lon1-lon2)*Math.cos(lat2),Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon1-lon2));
    if(angle<0.0)
    {
        angle+=Math.PI*2.0;angle=angle*degreesPerRadian;
    }
    return angle;
}

// Poygon getBounds extension - google-maps-extensions
// http://code.google.com/p/google-maps-extensions/source/browse/google.maps.Polygon.getBounds.js
if (!google.maps.Polygon.prototype.getBounds) {
    google.maps.Polygon.prototype.getBounds = function(latLng) {
        var bounds = new google.maps.LatLngBounds();
        var paths = this.getPaths();
        var path;

        for (var p = 0; p < paths.getLength(); p++) {
            path = paths.getAt(p);
            for (var i = 0; i < path.getLength(); i++) {
                bounds.extend(path.getAt(i));
            }
        }

        return bounds;
    }
};

// Polygon containsLatLng - method to determine if a latLng is within a polygon
google.maps.Polygon.prototype.containsLatLng = function(latLng) {
// Exclude points outside of bounds as there is no way they are in the poly
    var bounds = this.getBounds();

    if(bounds != null && !bounds.contains(latLng)) {
        return false;
    }

// Raycast point in polygon method
    var inPoly = false;

    var numPaths = this.getPaths().getLength();
    for(var p = 0; p < numPaths; p++) {
        var path = this.getPaths().getAt(p);
        var numPoints = path.getLength();
        var j = numPoints-1;

        for(var i=0; i < numPoints; i++) {
            var vertex1 = path.getAt(i);
            var vertex2 = path.getAt(j);

            if (vertex1.lng() < latLng.lng() && vertex2.lng() >= latLng.lng() || vertex2.lng() < latLng.lng() && vertex1.lng() >= latLng.lng()) {
                if (vertex1.lat() + (latLng.lng() - vertex1.lng()) / (vertex2.lng() - vertex1.lng()) * (vertex2.lat() - vertex1.lat()) < latLng.lat()) {
                    inPoly = !inPoly;
                }
            }

            j = i;
        }
    }

    return inPoly;
};

google.maps.LatLng.prototype.distanceFrom = function(newLatLng) {
// setup our variables
    var lat1 = this.lat();
    var radianLat1 = lat1 * ( Math.PI / 180 );
    var lng1 = this.lng();
    var radianLng1 = lng1 * ( Math.PI / 180 );
    var lat2 = newLatLng.lat();
    var radianLat2 = lat2 * ( Math.PI / 180 );
    var lng2 = newLatLng.lng();
    var radianLng2 = lng2 * ( Math.PI / 180 );
// sort out the radius, MILES or KM?
    var earth_radius = 3959; // (km = 6378.1) OR (miles = 3959) - radius of the earth

// sort our the differences
    var diffLat = ( radianLat1 - radianLat2 );
    var diffLng = ( radianLng1 - radianLng2 );
// put on a wave (hey the earth is round after all)
    var sinLat = Math.sin( diffLat / 2 );
    var sinLng = Math.sin( diffLng / 2 );

// maths - borrowed from http://www.opensourceconnections.com/wp-content/uploads/2009/02/clientsidehaversinecalculation.html
    var a = Math.pow(sinLat, 2.0) + Math.cos(radianLat1) * Math.cos(radianLat2) * Math.pow(sinLng, 2.0);

// work out the distance
    var distance = earth_radius * 2 * Math.asin(Math.min(1, Math.sqrt(a)));

// return the distance
    return distance;
};