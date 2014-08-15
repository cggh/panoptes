// This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License. 
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

// Automatic creation of DQXServer url s
serverUrl = window.location.pathname.split('/');
serverUrl.pop();
serverUrl = serverUrl.join('/') + '/api';

// Alternatively, one can set the DQXServer url explicitly
//serverUrl = "/DQXServer/app";
//serverUrl = "http://localhost:8000/app";
