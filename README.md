# Flickr-Crawler

## Install and Execution
1. Install MongoDB.

2. Install this.

```
npm install -g flickr-crawler
npm install -g forever
```
You can also install to local. (bin/bin.js is the start point of the crawler.)
```
npm install flickr-crawler
```

3. Set Api Key of Flickr

4. Update parameter file (See ./parameter.json)
```
{
    "static": [{
            "tags": "abarth"
        },
        {
            "tags": "fiat"
        },
        {
            "tags": "aprilia"
        }
    ],
    "bbox": [
        [-180, -90, 180, 90]
    ],
    "timestamp": {
        "start": 1420070400,
        "finish": 1483228799,
        "delta": 6000
    },
    "extras": [
        "geo", "tags", "url_sq", "url_z"
    ]
}
```

5. Start crawling (See usage)

## Usage
```
# flickr-crawler
```

```
[2017-01-13 21:39:25.076] [FATAL] logging - -s/--storage is required.

[USAGE]
    -c/--crawl          : Path to the Prameter JSON file [default=./parameter.json]
    -p/--parallel       : Number of parrallel execution [default=1]
    -t/--task           : Crawling mode: new (clear existing tasks), append (append tasks), resume(just do existing tasks) [default=new]
    -s/--storage        : URL of storage [e.g. mongodb://localhost:27017/flickr-crawler]
```

## Parameter Example

### Crawling photographs with tag "car" or "train" that was taken in Japan in 2016.
* parameter.json
  * bbox: http://boundingbox.klokantech.com/
    * as CSV RAW format
  * linux timestamp: http://www.unixtimestamp.com/
```
{
    "static": [{
            "tags": "car"
        },
        {
            "tags": "train"
        }
    ],
    "bbox": [
        [-180, -90, 180, 90]
    ],
    "timestamp": {
        "start": 1420070400,
        "finish": 1483228799,
        "delta": 6000
    },
    "extras": [
        "geo", "tags", "url_sq", "url_z"
    ]
}
```

# Start Crawling
## Execute
```
# forever start -m 1 bin/bin.js -c 
```


## Log
1. Check the path to the log file
```
# forever list
data:    [2] P4Gl /usr/bin/node bin/bin.js -s mongodb://localhost:27017/test 1572    1578 /home/user/.forever/P4Gl.log 0:0:0:2.637
```
2. Open the file
```
tail -f /home/user/.forever/P4Gl.log
```

## Result
### Number Of photographs
```
mongo *database-name*
> db.flickr_photo.count()
1293103
```
