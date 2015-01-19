"use strict";

var http            = require('http');
var spawn 	    = require('child_process').spawn;
var exec            = require('child_process').exec;
var util            = require('util');

var POLL_INTERVAL   = process.env.POLL_INTERVAL || 500;

var queue = function (worker) {
    var _q = [];
    var running = false;
    var q = {
        push: function (obj) {
            _q.push(obj);
            q.process();
        },
        process: function () {
            if (running || _q.length === 0) return;
            running = true;
            var cb = function () {
                running = false;
                q.process();
            }
            var task = _q.shift();
            worker(task, cb);
        }
    }
    return q;
}

function callbackOrDummy (callback, poll_func) {
    if (!callback) return function () {};
    if (poll_func) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            //console.log("Polling for results before returning with: " + JSON.stringify(args));
            poll_func(function (err) {
                // console.log("Inside...");
                if (err) {
                    // We could send back the original arguments,
                    // but I'm assuming that this error is better.
                    callback(err)
                } else {
                    callback.apply(null, args);
                }
            });
        }
    }
    else {
        return callback;
    }
}

function unwrapArray (arr) {
    return arr && arr.length == 1 ? arr[0] : arr
}

function wrapArray(arr) {
    // Ensure that arr is an Array
    return (arr instanceof Array) ? arr : [arr];
}

exports.create = function (callback, options) {
    if (options === undefined) options = {};
    if (options.slimerPath === undefined) options.slimerPath = './slimerjs-0.9.4/slimerjs';
    if (options.parameters === undefined) options.parameters = {};

    function spawnSlimer (callback) {
        var args=[];
        for(var parm in options.parameters) {
            args.push('--' + parm + '=' + options.parameters[parm]);
        }
        args = args.concat([__dirname + '/bridge.js']);
	//console.log('launch ' + options.slimerPath + ' ' + args);
        var slimer = spawn(options.slimerPath, args);
	
        // Ensure that the child process is closed when this process dies
        var closeChild = function () {
            try {
                slimer.kill();
            } catch(e) {}
            process.exit(1);
        };

        var uncaughtHandler = function (err) {
            console.error('Slimer spawn err: ' + err.stack);
            closeChild();
        };

        // Note it's possible to blow up maxEventListeners doing this - consider moving to a single handler.
        ['SIGINT', 'SIGTERM'].forEach(function(sig) {
            process.on(sig, closeChild);
        });

        process.on('uncaughtException', uncaughtHandler);

        slimer.once('error', function (err) {
        	callback(err);
        });

        slimer.stderr.on('data', function (data) {
            if (options.ignoreErrorPattern && options.ignoreErrorPattern.exec(data)) {
                return;
            }
            return console.warn('slimer stderr: '+data);
        });

        var exitCode = 0;
        slimer.once('exit', function (code) {
            ['SIGINT', 'SIGTERM'].forEach(function(sig) {
                process.removeListener(sig, closeChild);
            });
            process.removeListener('uncaughtException', uncaughtHandler);
            exitCode = code;
        });

        // Wait for "Ready" line
        slimer.stdout.once('data', function (data) {
	    //console.log('bridge send: '+ data);
            // setup normal listener now
            slimer.stdout.on('data', function (data) {
                return console.log('slimer stdout: '+data);
            });
            
            var matches = data.toString().match(/Ready \[(\d+)\]/);
            if (!matches) {
                slimer.kill();
                return callback("Unexpected output from SlimerJS: " + data);
            }

            var port = parseInt(matches[1], 0);
            callback(null, slimer, port);
            //callback(null, slimer, 62611);
        });

        setTimeout(function () {    //wait a bit to see if the spawning of slimerjs immediately fails due to bad path or similar
        	if (exitCode !== 0) {
        		return callback("Slimer immediately exited with: " + exitCode);
        	}
        },100);
    };
    
    spawnSlimer(function (err, slimer, port) {
        if (err) {
            return callback(err);
        }

        console.log("Slimer spawned with web server on port: " + port);

        var pages = {};

        var setup_new_page = function (id) {
            console.log("Page created with id: " + id);
            var methods = [
                'addCookie', 'childFramesCount', 'childFramesName', 'clearCookies', 'close',
                'currentFrameName', 'deleteCookie', 'evaluateJavaScript',
                'evaluateAsync', 'getPage', 'go', 'goBack', 'goForward', 'includeJs',
                'injectJs', 'open', 'openUrl', 'release', 'reload', 'render', 'renderBase64',
                'sendEvent', 'setContent', 'stop', 'switchToFocusedFrame', 'switchToFrame',
                'switchToFrame', 'switchToChildFrame', 'switchToChildFrame', 'switchToMainFrame',
                'switchToParentFrame', 'uploadFile',
            ];
            var page = {
                setFn: function (name, fn, cb) {
                    request_queue.push([[id, 'setFunction', name, fn.toString()], callbackOrDummy(cb, poll_func)]);
                },
                get: function (name, cb) {
                    request_queue.push([[id, 'getProperty', name], callbackOrDummy(cb, poll_func)]);
                },
                set: function (name, val, cb) {
                    request_queue.push([[id, 'setProperty', name, val], callbackOrDummy(cb, poll_func)]);
                },
                evaluate: function (fn, cb) {
                    var extra_args = [];
                    if (arguments.length > 2) {
                        extra_args = Array.prototype.slice.call(arguments, 2);
                        // console.log("Extra args: " + extra_args);
                    }
                    request_queue.push([[id, 'evaluate', fn.toString()].concat(extra_args), callbackOrDummy(cb, poll_func)]);
                },
                waitForSelector: function (selector, cb, timeout) {
                    var startTime = Date.now();
                    var timeoutInterval = 150;
                    var testRunning = false;
                    //if evaluate succeeds, invokes callback w/ true, if timeout,
                    // invokes w/ false, otherwise just exits
                    var testForSelector = function () {
                        var elapsedTime = Date.now() - startTime;

                        if (elapsedTime > timeout) {
                            return cb("Timeout waiting for selector: " + selector);
                        }

                        page.evaluate(function (selector) {
                            return document.querySelectorAll(selector).length;
                        }, function (err, result) {
                            testRunning = false;
                            if (result > 0) {//selector found
                                cb();
                            }
                            else {
                                setTimeout(testForSelector, timeoutInterval);
                            }
                        }, selector);
                    };

                    timeout = timeout || 100; //default timeout is 10 sec;
                    setTimeout(testForSelector, timeoutInterval);
                }
            };
            methods.forEach(function (method) {
                page[method] = function () {
                    var all_args = Array.prototype.slice.call(arguments);
                    var callback = null;
                    if (all_args.length > 0 && typeof all_args[all_args.length - 1] === 'function') {
                        callback = all_args.pop();
                    }
                    var req_params = [id, method];
                    request_queue.push([req_params.concat(all_args), callbackOrDummy(callback, poll_func)]);
                }
            });

            pages[id] = page;

            return page;            
        }

        var poll_func = setup_long_poll(slimer, port, pages, setup_new_page);

        var request_queue = queue(function (paramarr, next) {

            var params = paramarr[0];
            var callback = paramarr[1];
            var page = params[0];
            var method = params[1];
            var args = params.slice(2);

            var http_opts = {
                hostname: 'localhost',
                port: port,
                path: '/',
                method: 'POST'
            }

            slimer.POSTING = true;

            var req = http.request(http_opts, function (res) {

                 //console.log("Got a response: " + res.statusCode);
                var err = res.statusCode == 500 ? true : false;
                res.setEncoding('utf8');
                var data = '';
                res.on('data', function (chunk) {
                    data += chunk;
                });
                res.on('end', function () {
                    slimer.POSTING = false;
                    if (!data) {
                        next();
                        return callback("No response body for page." + method + "()");
                    }
		    //console.log('data to parse: '+data);
                    var results = JSON.parse(data);
                   // console.log("Response: ", results);
                    
                    if (err) {
                        next();
                        return callback(results);
                    }

                    if (method === 'createPage') {
                        var id = results.page_id;
                        var page = setup_new_page(id);
                        //console.log('prepare req for createPage');
                        next();
                        return callback(null, page);
                    }

                    // Not createPage - just run the callback
                    next();
                    callback(null, results);
                });
            });

            req.on('error', function (err) {
               // console.warn("Request() error evaluating " + method + "() call: " + err);
                callback("Request() error evaluating " + method + "() call: " + err);
            })

            req.setHeader('Content-Type', 'application/json');

            var json = JSON.stringify({page: page, method: method, args: args});
            // console.log("Sending: ", json);
            req.setHeader('Content-Length', Buffer.byteLength(json));
            req.write(json);
            req.end();
        });

        var proxy = {
            process: slimer,
            createPage: function (callback) {
                //console.log("push a 'createPage'");
		request_queue.push([[0,'createPage'], callbackOrDummy(callback, poll_func)]);
            },
            injectJs: function (filename,callback) {

                request_queue.push([[0,'injectJs', filename], callbackOrDummy(callback, poll_func)]);
            },
            addCookie: function (cookie, callback) {
                request_queue.push([[0,'addCookie', cookie], callbackOrDummy(callback, poll_func)]);
            },
            clearCookies: function (callback) {
                request_queue.push([[0, 'clearCookies'], callbackOrDummy(callback, poll_func)]);
            },
            deleteCookie: function (cookie, callback) {
                request_queue.push([[0, 'deleteCookie', cookie], callbackOrDummy(callback, poll_func)]);
            },
            set : function (property, value, callback) {
                request_queue.push([[0, 'setProperty', property, value], callbackOrDummy(callback, poll_func)]);
            },
            get : function (property, callback) {
                request_queue.push([[0, 'getProperty', property], callbackOrDummy(callback, poll_func)]);
            },
            exit: function(callback){

                slimer.kill('SIGTERM');
                callbackOrDummy(callback)();
            },
            on: function () {
                slimer.on.apply(slimer, arguments);
            }
        };
        
        callback(null, proxy);
    });
}

function setup_long_poll (slimer, port, pages, setup_new_page) {
    // console.log("Setting up long poll");

    var http_opts = {
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'GET'
    }

    var dead = false;
    slimer.once('exit', function () { dead = true; });

    var poll_func = function (cb) {
        if (dead) return cb('Slimer Process died');
        if (slimer.POSTING) return cb();
        // console.log("Polling...");
        var req = http.get(http_opts, function(res) {
            res.setEncoding('utf8');
            var data = '';
            res.on('data', function (chunk) {
                data += chunk;
            });
            res.on('end', function () {
                // console.log("Poll results: " + data);
                if (dead) return cb('Slimer Process died');
                try {
                    var results = JSON.parse(data);
                }
                catch (err) {
                    console.warn("Error parsing JSON from slimer: " + err);
                    console.warn("Data from slimer was: " + data);
                    return cb("Error parsing JSON from slimer: " + err
                            + "\nData from slimer was: " + data);
                }
                // if (results.length > 0) {
                //     console.log("Long poll results: ", results);
                // }
                // else {
                //     console.log("Zero callbacks");
                // }
                results.forEach(function (r) {
                    if (r.page_id) {
                        if (pages[r.page_id] && r.callback === 'onPageCreated') {
                            var new_page = setup_new_page(r.args[0]);
                            if (pages[r.page_id].onPageCreated) {
                                pages[r.page_id].onPageCreated(new_page);
                            }
                        }
                        else if (pages[r.page_id] && pages[r.page_id][r.callback]) {
                            var callbackFunc = pages[r.page_id][r.callback];
                            if (callbackFunc.length > 1) {
                                // We use `apply` if the function is expecting multiple args
                                callbackFunc.apply(pages[r.page_id], wrapArray(r.args));
                            }
                            else {
                                // Old `call` behaviour is deprecated
                                callbackFunc.call(pages[r.page_id], unwrapArray(r.args));
                            }
                        }
                    }
                    else {
                        var cb = callbackOrDummy(slimer[r.callback]);
                        cb.apply(slimer, r.args);
                    }
                });
                cb();
            });
        });
        req.on('error', function (err) {
            if (dead || slimer.killed) return;
           // console.warn("Poll Request error: " + err);
        });
    };

    var repeater = function () {
        setTimeout(function () {
            poll_func(repeater)
        }, POLL_INTERVAL);
    }

    repeater();

    return poll_func;
}
