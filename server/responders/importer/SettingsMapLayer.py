# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import absolute_import
from .ImportSettings import ImportSettings
from collections import OrderedDict


class SettingsMapLayer(ImportSettings):
    def getSettings(self):
        mapLayerSettings = OrderedDict((
            ('name', {
                'type': 'Text',
                'required': True,
                'description': 'Display name for this map layer)'
            }),
            ('description', {
                'type': 'Text',
                'required': False,
                'default': '',
                'description': 'A short description of this map layer.\n  Note: this text may contain documentation links (see :ref:`def-source-docs`)'
            }),
            ('format', {
                'type': 'Text',
                'required': True,
                'description': 'Type of the layer',
                'values': OrderedDict((
                    ('tile', {
                        'description': 'tile layer served by panoptes'
                    }),
                    ('image', {
                        'description': 'Single image overlay'
                    }),
                ))
            }),

            ('bounds', {
                'type': 'Block',
                'required': False,
                'settingRequired': {'name': 'format', 'value': 'image'},
                'description': 'The geographical bounds for the image',
                'children': OrderedDict((
                    ('northLat', {
                        'type': 'Value',
                        'required': True,
                        'description': 'Latitude for the top (north) of the image'
                    }),
                    ('southLat', {
                        'type': 'Value',
                        'required': True,
                        'description': 'Latitude for the bottom (south) of the image'
                    }),
                    ('westLng', {
                        'type': 'Value',
                        'required': True,
                        'description': 'Longitude for the left (west) of the image'
                    }),
                    ('eastLng', {
                        'type': 'Value',
                        'required': True,
                        'description': 'Longitude for the right (east) of the image'
                    })
                ))
            }),
            ('filePattern', {
                'type': 'Text',
                'required': False,
                'settingRequired': {'name': 'format', 'value': 'tile'},
                'description': 'String to describe the location of the tiles, either relative to the settings file or a URL, e.g. "tiles/{z}/{x}/{y}/image.png" or "http://tiles.org/{z}/{x}/{y}.png". Interpolates the values z (for zoom), x, and y.'
            }),
            ('maxNativeZoom', {
                'type': 'Value',
                'required': False,
                'settingRequired': {'name': 'format', 'value': 'tile'},
                'description': 'Max zoom level at which to request tiles for this layer'
            }),
            ('attribution', {
                'type': 'Text',
                'required': False,
                'description': 'The attribution for this layer'
            }),
            ('opacity', {
                'type': 'Value',
                'required': False,
                'description': 'The opacity for this layer'
            }),
            ('tms', {
                'type': 'Boolean',
                'required': False,
                'description': 'If true, applies settings for tiles that meet the Tile Map Service (TMS) specification, such as inversing the Y axis numbering.'
            })
        ))

        return mapLayerSettings

    def _getDocHeader(self):
        return '''.. _YAML: http://www.yaml.org/about.html

.. _def-settings-maplayer:

Map layer settings
~~~~~~~~~~~~~~~~~~~~~


This YAML_ file contains settings for a :ref:`Map Layer<dataconcept_maplayer>`. See also:

- :ref:`data-import-settings`
- :ref:`def-source-maplayer`
- `Example file
  <https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Samples_and_Variants/maps/tileLayer>`_

Possible keys
.............
'''

    def _getDocFilename(self):
        return 'documentation/importdata/importsettings/maplayer.rst'
