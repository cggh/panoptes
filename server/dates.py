import datetime
epoch = datetime.datetime.utcfromtimestamp(0)

def datetimeToJulianDay(dt):
    return ((dt - epoch).total_seconds() * 1000.0) / (24.0 * 60 * 60 * 1000) + 2440587.5
