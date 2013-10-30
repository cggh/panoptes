import DQXDbTools
import uuid
import os
import config
import VTTable
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
