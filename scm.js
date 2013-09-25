var exec = require('child_process').exec;
var path = require('path');
var util = require('util');
var _ = require('lodash');

var SCM = function() {
    return {
        setDefaults : function(options) {
            this.appcmd = "SC";
        },
        install : function(options,cb) {

            var self = this;

            var options_arr = options.length ? options : [options];
            var svc_cfg = options_arr.shift();

            var cmd = ' create "' + svc_cfg.name + '" binPath= "' + svc_cfg.path + '" start= ' + (svc_cfg.start || 'auto');
            cmd += ' displayName= "' + (svc_cfg.display || svc_cfg.name) + '"';

            exec(this.appcmd + ' ' + cmd,function(err,stdout) {
                    if (options_arr.length > 0) {
                        self.install(options_arr,cb);
                    }
                    else {
                        cb(err,stdout);
                    }
                }
            );

        },
        start : function(name,cb) {
            var serviceNames = typeof(name) == 'string' ? [name] : name;
            var self = this;
            var sname = serviceNames.shift();
            self.exists(sname,function(err,de) {

                if (de) {//if exists

                    exec(self.appcmd + ' start "' + sname + '"',function(err,stdout) {

                        if (serviceNames.length > 0) {
                            self.start(serviceNames,cb);
                        }
                        else {
                            if (cb) {
                                cb(err,stdout);
                            }
                            else {
                                console.log(stdout);
                            }
                        }
                    });

                }
                else {
                    if (serviceNames.length > 0) {
                        self.start(serviceNames,cb);
                    }
                    else {
                        cb(null,sname + ' does not exist');
                    }
                }

            });
        },
        waitStop : function(name,check_cnt,cb) {
            var self = this;
            this.runningStatus(name,function(err,status) {
                if (status === 1) {
                    if (cb) {
                        cb(null,name + ' stopped');
                    }
                    else {
                        console.log('Service stopped');
                    }


                }
                else {
                    console.log(status);
                    if (check_cnt > 0) {
                        console.log(check_cnt);
                        setTimeout(function() {
                                self.waitStop.call(self,name,--check_cnt,cb);
                            }
                            ,500);
                    }
                    else {
                        console.log('Cannot stop service');
                        process.exit();
                    }

                }

            });


        },
        stop : function(name,cb,running_services) {
            var self = this;
            var serviceNames = typeof(name) == 'string' ? [name] : name;
            var sname = serviceNames.shift();

            //
            //track services that were running
            //
            running_services = running_services || [];

            this.runningStatus(sname,function(err,status) {
                if (status === 4) {
                    running_services.push(sname);
                    exec(self.appcmd + ' stop "' + sname + '"',function(err,res) {

                        setTimeout(function() {
                                self.waitStop.call(self,sname,50,function(err,stdout) {

                                    console.log(stdout);
                                    if (serviceNames.length > 0) {
                                        self.stop(serviceNames,cb,running_services);
                                    }
                                    else {
                                        cb(err,running_services,stdout);
                                    }
                                });
                            }
                            ,10);

                    });
                }
                else {
                    if (serviceNames.length > 0) {
                        self.stop(serviceNames,cb,running_services);
                    }
                    else {
                        cb(err,running_services,'');
                    }

                }


            });
        },
        delete : function(name,cb) {
            var serviceNames = typeof(name) == 'string' ? [name] : name;
            var self = this;
            var sname = serviceNames.shift();
            self.exists(sname,function(err,de) {

                if (de) {//if exists

                    self.stop(sname,function(err,stat) {

                        exec(self.appcmd + ' delete "' + sname + '"',function(err,stdout) {

                            console.log(stdout);
                            if (serviceNames.length > 0) {
                                self.delete(serviceNames,cb);
                            }
                            else {
                                if (cb) {
                                    cb(err,stdout);
                                }
                                else {
                                    console.log(stdout);
                                }
                            }
                        });
                    });
                }
                else {
                    if (serviceNames.length > 0) {
                        self.delete(serviceNames,cb);
                    }
                    else {
                        cb(null,sname + ' does not exist');
                    }
                }

            });
        },
        exists: function(name,callback) {
            exec(util.format(this.appcmd + ' GetDisplayName "%s"',name),function(err,stdout,stderr) {
                callback(err,_.isEmpty(err));
            });
        },
        runningStatus : function(name,cb) {
            var self = this;
            this.query(name, function(err,qobj) {
                if (!err) {
                    //
                    // return a status of 1 (stopped) if no state is returned
                    //
                    var status = qobj.state ? parseInt(qobj.state.substring(0,1)) : 1;
                    cb(null,status);
                }
                else {
                    cb(err,false);
                }

            });

        },
        query : function(name,cb) {
            exec(this.appcmd + ' query "' + name + '"',function(err,stdout) {
                if (!err) {
                    var enumlines = stdout.trim().split('\r\n');

                    var queryObj = {};
                    var lastKey = null;
                    for (var i = 0; i < enumlines.length; ++i) {
                        if (enumlines[i].indexOf(':') !== -1) {
                            var kv = enumlines[i].split(':');
                            lastKey  = kv[0].trim().toLowerCase();
                            queryObj[lastKey] = kv[1].trim();
                        }
                        else {
                            queryObj[lastKey] += ' ' + enumlines[i].trim();
                        }
                    }
                    if (cb) {
                        cb(null,queryObj);
                    }
                    else {
                        console.log(queryObj);
                    }
                }
                else {
                    if (cb) {
                        cb(err,stdout);
                    }
                    else {
                        console.log(err,stdout);
                    }
                }

            });

        }
    };
}();

SCM.setDefaults({});

module.exports = SCM;


