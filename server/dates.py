import datetime
epoch = datetime.datetime.utcfromtimestamp(0)

def datetimeToJulianDay(dt):
    if dt is not None:
        return ((dt - epoch).total_seconds() * 1000.0) / (24.0 * 60 * 60 * 1000) + 2440587.5
    else:
        return None
