import config
from os.path import join
from diskcache import FanoutCache

with FanoutCache(join(config.BASEDIR, 'cache'),
                 shards=4,
                 size_limit=int(5e10),
                 large_value_threshold=4096,
                 eviction_policy='least-recently-used',
                 timeout=10
                 ) as cache:
    def getCache():
        return cache
