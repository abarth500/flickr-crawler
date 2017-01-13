var pap = require("posix-argv-parser");
var async = require('async');
var flickr = require("flickr-search");
var log4js = require('log4js');
log4js.configure('./log4js.json');
var log = log4js.getLogger('logging');
log.fatal('FATAL logging is activated.');
log.error('ERROR logging is activated.');
log.warn('WARN logging is activated.');
log.info('INFO logging is activated.');
log.debug('DEBUG logging is activated.');
log.trace('TRACE logging is activated.');
var args = pap.create();
var bbox = [];
var param = [];
var v = pap.validators;
var opt = {};
args.createOption(["-c", "--crawl"], {
    description: "Path to the Prameter JSON file.",
    defaultValue: process.cwd() + "/paramter.json",
    validators: [v.file()],
    transform: function(value) {
        var fs = require('fs');
        return JSON.parse(fs.readFileSync(value, 'utf-8'));
    }
});
args.createOption(["-p", "--parallel"], {
    description: "Number of parrallel execution [default=4]",
    validators: [v.integer()],
    transform: function(value) { return parseInt(value, 10); },
    defaultValue: 2
});
args.createOption(["-t", "--task"], {
    description: "Crawling mode: new (clear existing tasks), append (append tasks), resume(just do existing tasks) [default=new]",
    defaultValue: "new"
});
args.createOption(["-s", "--storage"], {
    description: "URL of storage [default=mongodb://localhost:27017/flickr-crawler]",
    defaultValue: "mongodb://localhost:27017/flickr-crawler"
});
args.parse(process.argv.slice(2), function(errors, options) {
    if (errors) {
        errors.forEach(function(er) {
            log.fatal(er);
        });
        console.log("\n[USAGE]");
        args.options.forEach(function(opt) {
            console.log("    " + opt.signature + (Array(21 - opt.signature.length).join(" ")) + ": " + opt.description);
        });
        process.exit(1);
    }
    var input = options["--crawl"].value;
    var static = [];
    for (var c in input.static) {
        static.push(input.static[c]);
    }
    if (input.hasOwnProperty("bbox")) {
        bbox = input.bbox;
    } else {
        bbox = [
            [-180, -90, 180, 90]
        ];
    }
    var setting = {};
    setting["storage"] = options["--storage"].value;
    setting["parallel"] = options["--parallel"].value;
    setting["task"] = options["--task"].value;
    var cursor = {};
    if (input.hasOwnProperty("timestamp") &&
        input.timestamp.hasOwnProperty("start") &&
        input.timestamp.hasOwnProperty("finish")) {
        cursor = {
            "start": input.timestamp.start,
            "finish": input.timestamp.finish,
            "current": input.timestamp.start
        };
        if (input.hasOwnProperty("limit")) {
            cursor["limit"] = input.limit;
        }
    } else {
        log.fatal("Argv Format Error (timestamp)");
        throw new Error("timestamp format error");
    }
    for (let b = 0; b < bbox.length; b++) {
        for (let s = 0; s < static.length; s++) {
            let p = Object.assign({}, static[s]);
            p["bbox"] = bbox[b];
            p["extras"] = input.extras;
            p["page"] = 1;
            param.push({
                "parameter": p,
                "cursor": {
                    start: input.timestamp.start,
                    finish: input.timestamp.finish,
                    current: input.timestamp.start,
                    delta: input.timestamp.delta,
                    window: input.timestamp.delta,
                }
            });
        }
    }
    var crawler = require('../index.js');
    log.info("START CRAWLING");
    log.debug("SETTING: " + JSON.stringify(setting));
    log.debug("PARAMS:  " + JSON.stringify(param));
    crawler.run(setting, param);
});