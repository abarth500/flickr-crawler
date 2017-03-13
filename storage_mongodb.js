var colTask = 'flickr_task';
var colPhoto = 'flickr_photo';

var async = require('async');
var log4js = require('log4js');
var fs = require('fs');
var log;

exports.init = function(mongourl, callback) {
    if (fs.existsSync(process.cwd() + '/log4js.json')) {
        log4js.configure(process.cwd() + '/log4js.json');
    } else {
        log4js.configure(__dirname + '/log4js.json');
    }
    log = log4js.getLogger('logging');
    var MongoClient = require('mongodb').MongoClient;
    var url = mongourl; /*'mongodb://localhost:27017/sample1';*/
    MongoClient.connect(url, function(err, db) {
        if (err) {
            log.fatal('MONGODB-> Connection Error');
            throw new Error("mongodb error:", err);
        }
        var storage = new StorageMongoDB(db);
        callback(err, storage);
        /*db.close();*/
    })
}

var db = null

function StorageMongoDB(_db) {
    db = _db;
}
StorageMongoDB.prototype.clearTasks = function(callback) {
    log.trace("START-> clearTasks");
    db.collection(colTask).deleteMany({}, null, function() {
        db.collection(colPhoto).deleteMany({}, null, function() {
            db.collection(colPhoto).dropIndexes(function() {
                db.collection(colPhoto).createIndex({ id: 1 }, { unique: true }, function() {
                    db.collection(colPhoto).createIndex({ "geotag": "2dsphere" }, {}, function() {
                        db.collection(colPhoto).createIndex({ tags: 1 }, {}, function() {
                            db.collection(colTask).createIndex({ "cursor.current": 1 }, {}, callback);
                        });
                    });
                });
            });
        });
    });
}
StorageMongoDB.prototype.setTasks = function(tasks, callback) {
    log.trace("START-> setTasks");
    if (tasks.length > 0) {
        log.trace(JSON.stringify(tasks));
        db.collection(colTask).insertMany(tasks, null, callback);
    } else {
        log.warn("Given 0 tasks.");
        setImmediate(callback, null);
    }
}
StorageMongoDB.prototype.getTasks = function(n, callback) {
    log.trace("START-> getTasks (size=" + n + ")");
    async.times(n, function(z, next) {
        db.collection(colTask).findOneAndDelete({}, { sort: { "cursor.current": 1 } }, function(e, a) {
            log.trace("findOneAndDelete :" + JSON.stringify(a.value));
            if (!e && typeof a.value != null) {
                next(null, a.value);
            } else {
                next(null, null);
            }
        });
    }, function(err, results) {
        tasks = [];
        async.each(results, function(result, cb) {
            if (result != null) {
                tasks.push(result);
            }
            cb(null);
        }, function(err) {
            log.trace("FINISH-> getTasks return:" + JSON.stringify(tasks));
            callback(null, tasks);
        });
    });
}
StorageMongoDB.prototype.setPhotos = function(photos, callback) {
    log.trace("START-> setPhotos");
    if (photos.length > 0) {
        async.each(photos, function(photo, next) {
            photo.tags = photo.tags.split(" ");
            if (photo.tags.length == 1 && photo.tags[0] == "") {
                photo.tags = [];
            }
            photo.dateupload = parseInt(photo.dateupload);
            photo.longitude = parseFloat(photo.longitude);
            photo.latitude = parseFloat(photo.latitude)
            photo.geotag = { type: "Point", coordinates: [parseFloat(photo.longitude), parseFloat(photo.latitude)] };
            log.trace("Insert PHOTO (" + photo.id + ")");
            next();
        }, function(err) {
            if (err) {
                log.err(err);
                callback(err);
            } else {
                try {
                    db.collection(colPhoto).insertMany(photos, { ordered: false }, callback);
                } catch (e) {
                    throw e;
                }
            }
        });
    } else {
        log.warn("Given 0 photos.");
        setImmediate(callback, null);
    }
}
StorageMongoDB.prototype.getReaults = function(callback) {

}