# -*- coding: utf-8 -*-
from __future__ import print_function
from ImportSettings import ImportSettings
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
                    ('tileURL', {
                        'description': 'Remotely served tiles'
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
                    ('topLeft', {
                        'type': 'List',
                        'required': True,
                        'description': 'Lat lng for top-left (NW) point of image'
                    }),
                    ('bottomRight', {
                        'type': 'List',
                        'required': True,
                        'description': 'Lat lng for bottom-right (SE) point of image'
                    })
                ))
            }),
            ('filePattern', {
                'type': 'Text',
                'required': False,
                'settingRequired': [{'name': 'format', 'value': 'tile'}, {'name': 'format', 'value': 'tileURL'}],
                'description': 'String to describe the location of tiles relative to the settings file ("tile") or a URL ("tileURL") e.g. "tiles/{zoom}/{x}/{y}/image.png". Interpolates the values zoom, x, and y.'
            }),
            ('maxNativeZoom', {
                'type': 'Value',
                'required': False,
                'settingRequired': [{'name': 'format', 'value': 'tile'}, {'name': 'format', 'value': 'tileURL'}],
                'description': 'Max zoom level at which to request tiles for this layer'
            }),
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
