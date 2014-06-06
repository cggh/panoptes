// This file is part of Panoptes - Copyright (C) 2014 CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

// Automatic creation of DQXServer url in case the html file is served from a 'static' subdirectory of DQXServer
// Note that this is the default behaviour implemented in the Panoptes build script
if (window.location.pathname.indexOf('static/')<0) {
    alert('ERROR: unable to determine DQXServer location. Please specify manually in _SetServerUrl.js');
    serverUrl = '/DQXServer/app';
}
else {
    serverUrl = window.location.pathname.split('static/')[0];
}

// Alternatively, one can set the DQXServer url explicitly
//serverUrl = "/DQXServer/app";
//serverUrl = "http://localhost:8000/app";
