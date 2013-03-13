var async = require('async'),
    fs = require('fs'),
    fse = require('fs-extra'),
    path = require('path'),
    config = require('../config.js');

function getLocations(slug, opts){
    var relative = opts.config.physical(slug),
        physical = path.join(config.static.bin, relative),
        folder = path.dirname(physical);

    return {
        relative: relative,
        physical: physical,
        folder: folder
    }
}

function getMetaXml(opts){
    return function(req,res,next){
        var blog = req.blog;
        if(!blog){
            return next();
        }

        var loc = getLocations(blog.slug, opts);

        fse.mkdirs(loc.folder, function(err){
            if(err){
                throw err;
            }

            fs.exists(loc.physical, function(exists){
                if(exists){
                    fs.stat(loc.physical,function(err, stats){
                        var now = new Date;
                        if (now - stats.mtime > opts.config.cache){
                            return opts.setup(req, serve(res));
                        }else{
                            return serve(res)(null,null,loc.physical);
                        }
                    });
                }else{
                    return opts.setup(req, serve(res));
                }
            });
        });
    };
}

function serve(res){
    return function(err,xml,physical){
        if(err){
            throw err;
        }

        if(xml){
            res.header('Content-Type', 'application/xml');
            res.end(xml);
        }else{
            res.sendfile(physical);
        }
    };
}

function writeToDisk(slug,opts){
    var loc = getLocations(slug, opts);

    async.series([
        async.apply(fse.mkdirs,loc.folder),
        async.apply(fse.delete,loc.physical),
        async.apply(fs.writeFile,loc.physical,opts.data)
    ], function(err){
        if(err){
            return done(err);
        }

        opts.done(err,opts.data,loc.physical);
    });
}

module.exports = {
    get: getMetaXml,
    writeToDisk: writeToDisk
};