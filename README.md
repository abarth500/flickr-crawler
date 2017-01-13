# Flickr-Crawler

## Install and Execution
### [STEP.1] Install MongoDB.

### [STEP.2] Install this.

```
npm install flickr-crawler
npm install -g forever
```

### [STEP.3] Set Api Key of Flickr
* Find (or Create) Your API KEY
  * https://www.flickr.com/services/apps/
* And Set the KEY
```
# node  $(npm bin)/flickr-crawler
Your Flickr's API key? ******************************
OK!
Your Flickr's API Secret? ****************************
YES!
```

### [STEP.4] Create your parameter file (See ./node_module/flickr-crawler/parameter.json)
```
# cp ./node_module/flickr-crawler/parameter.json .
# vi ./parameter.json
```

### [STEP.5] Start crawling (See usage)

## Usage
```
# node $(npm bin)/flickr-crawler
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
# forever start -m 1 --workingDir . $(npm bin)/flickr-crawler -s mongodb://localhost:27017/test -c ./parameter.json
```

## Log
1. Check the path to the log file
```
# forever list
data:    [2] P4Gl /usr/bin/node path/to/the/bin.js -s mongodb://localhost:27017/test 1572    1578 /home/user/.forever/P4Gl.log 0:0:0:2.637
```
2. Open the file
```
# tail -f /home/user/.forever/P4Gl.log
```

## Result
### Number Of photographs
```
# mongo *database-name*
> db.flickr_photo.count()
1293103
```
