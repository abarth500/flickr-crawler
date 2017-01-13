var async = require('async');
var flickr = require('flickr-search');
var log4js = require('log4js');

exports.run = function(setting, params) {
    log4js.configure(__dirname + '/log4js.json');
    var log = log4js.getLogger('logging');
    var storage = null;
    var url = require('url');
    let u = url.parse(setting.storage);
    setting.protcol = u.protocol;
    log.info('Strage:' + setting.storage);
    switch (setting.protcol) {
        case 'mongodb:':
            storage = require(__dirname + '/storage_mongodb.js');
            log.debug('SUCCESS: Storage Type: ' + setting.protcol);
            break;
        default:
            log.fatal('Invalid storage type:' + setting.storage);
            throw new Error('Invalid storage type:' + setting.storage);
    }
    storage.init(setting.storage, function(err, storage) {
        var workflow = [];
        if (setting.task == "new") {
            log.trace("IN-> Workflow(new)");
            workflow.push(storage.clearTasks);
        }
        if (setting.task != "resume") {
            log.trace("IN-> Workflow(resume)");
            workflow.push(async.apply(storage.setTasks, params));

        }
        log.trace("IN-> Workflow(crawl)");
        workflow.push(function(callbackWorkflow) {
            async.forever(function(callbackForever) {
                log.trace("START-> forever roop");
                storage.getTasks(setting.parallel, function(err, tasks) {
                    log.trace("START-> tasks (paralell=" + tasks.length + ")");
                    if (tasks.length == 0) {
                        log.info("No Tasks are found. Finish clawring.");
                        callbackForever("fin");
                    } else {
                        async.map(tasks, function(task, callbackMap) {
                            /*並列クロールのタスク*/
                            var p = {};
                            p["min_upload_date"] = task.cursor.current;
                            p["max_upload_date"] = task.cursor.current + task.cursor.window;
                            /*p["sort"] = "date-posted-asc";*/
                            p["per_page"] = 250;
                            async.forEachOf(task.parameter, function(value, key, callback) {
                                if (key != "_id") {
                                    if (key == "bbox") {
                                        p[key] = value.join(",");
                                    } else if (key == "extras") {
                                        p[key] = value.join(",");
                                        p[key] += ",date_upload";
                                    } else {
                                        p[key] = value;
                                    }
                                }
                                callback();
                            }, function(err) {
                                log.info("FLICKR-> search |" + JSON.stringify(p));
                                flickr.search(p, function(stat, photos, page, pages, perpage, total) {
                                    log.info("FLICKR-> result | stat=" + stat + "| num=" + photos.length + "| page=" + page + " of " + pages);
                                    if (stat == 'ok') {
                                        let newTask = Object.assign({}, task);
                                        delete newTask._id;
                                        delete newTask.parameter.min_upload_date;
                                        delete newTask.parameter.max_upload_date;
                                        if (pages > 10 && newTask.cursor.window >= newTask.cursor.delta * 2) {
                                            /* pages が10より大きくWindowsサイズもdelta*2以上の場合はwindowを半分にして再クロール(写真は登録しない)*/
                                            log.info("\tDecrease window size. [" + newTask.cursor.window + " -> " + Math.ceil(newTask.cursor.window / 2) + "]");
                                            newTask.cursor.window　 = Math.ceil(newTask.cursor.window / 2);
                                            photos = [];
                                        } else if (pages > 10 && page >= 10) {
                                            log.info("\tGive up! (" + pages + " pages in " + newTask.cursor.window + " sec.)");
                                            newTask.cursor.current += newTask.cursor.window;
                                            newTask.parameter.page = 1;
                                        } else if (pages == 0 || (pages <= 2 && pages == page)) {
                                            /* pagesが2以下の場合でかつ最終頁まで来た場合はwindowを倍に拡張(写真は登録) */
                                            log.info("\tIncrease window size. [" + newTask.cursor.window + " -> " + (newTask.cursor.window * 2) + "]");
                                            newTask.cursor.current += newTask.cursor.window;
                                            newTask.parameter.page = 1;
                                            newTask.cursor.window　 = newTask.cursor.window * 2;
                                        } else if (pages == page) {
                                            /* 最終頁まで来たので次のdeltaへ*/
                                            log.info("\tGo to next Window.");
                                            newTask.cursor.current += newTask.cursor.window;
                                            newTask.parameter.page = 1;
                                        } else if (page < pages && photos.length > 0) {
                                            /* まだ写真があるので次のpageへ */
                                            log.info("\tGo to next Page.");
                                            newTask.parameter.page++;
                                        } else {
                                            /* Flickrの動作がおかしいのでとりあえず次のdeltaへ進む*/
                                            log.error("\tSomething Wrong...(Go to next window)");
                                            newTask.cursor.current += newTask.cursor.window;
                                            newTask.parameter.page = 1;
                                        }
                                        if (newTask.cursor.current > newTask.cursor.finish) {
                                            log.info("FLICKR-> Crawring is finished.");
                                            newTask = [];
                                        } else {
                                            log.info("FLICKR-> Next Task :" + 100 * (newTask.cursor.current - newTask.cursor.start) / (newTask.cursor.finish - newTask.cursor.start) + "% done.");
                                            newTask = [newTask];
                                        }
                                        storage.setTasks(newTask, function(err) {
                                            log.trace("setTasks done.");
                                            storage.setPhotos(photos, function(err) {
                                                if (err) {
                                                    if (err.writeErrors) {
                                                        log.warn("Duplicate PhotoID");
                                                        async.eachSeries(err.writeErrors, function(error, cb) {
                                                            if (error.code == 11000) {
                                                                let op = error.toJSON().op;
                                                                log.trace(op.id + " | " + op.dateupload);
                                                            } else {
                                                                log.trace(error.id + "\t" + error.errmsg);
                                                            }
                                                            cb(null);
                                                        }, function() {
                                                            log.warn(err.writeErrors.length + " errors are reported.");
                                                        });
                                                    } else {
                                                        log.warn(err.message);
                                                    }
                                                }
                                                log.debug("setPhotos done.");
                                                callbackMap(null);
                                            });
                                        });
                                    } else {
                                        log.fatal("Flickr API ERROR" + JSON.stringify(stat));
                                        callbackMap("flickr");
                                    }
                                });
                            });
                        }, function(errs) {
                            log.trace("FINISH-> tasks" + JSON.stringify(errs));
                            callbackForever(null);
                        });
                    }
                });
            }, function(err) {
                log.trace("FINISH-> forever roop " + JSON.stringify(err));
                callbackWorkflow(null);
            });
        });
        async.series(workflow, function(err) {
            log.info("ALL DONE.");
            process.exit();
        });
    });
}