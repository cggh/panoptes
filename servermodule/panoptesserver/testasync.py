# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import uuid
import os
import config
from DQXTableUtils import VTTable
import time
import asyncresponder


def ResponseExecute(data, calculationObject):
    for i in range(13):
        calculationObject.SetInfo('Calculation, part 1', i/13.0)
        time.sleep(0.5)
    calculationObject.SetInfo('Calculation, part 2')
    time.sleep(2)
    #raise Exception('Ouch, an error occurred')

def response(returndata):
    return asyncresponder.RespondAsync(ResponseExecute, returndata, "Test")
