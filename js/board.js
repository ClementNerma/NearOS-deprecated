/*
 * Enable console backtrace
 * @type {boolean}
 */

var ENABLE_CONSOLE_BACKTRACE = false;

/**
 * [Automatic parameter] Has client console.log function
 * @type {boolean}
 */

var HAS_CLIENT_CONSOLE_LOG = isObject(console) && isFunction(console.log);

/**
 * The board storage interface
 * @type {storage}
 */

var boardStorage = new storage({
    filter: function (type, name, path, content) {

        if(!path || !isString(path)) return board.console.error('Invalid path : Must be a non-empty string !');

        if (type === 'storage' && path.match(/(\r|\n|\r\n|"|'|<|>)/))
            return board.console.error('Invalid storage path : ' + path);

        if (type === 'existsFile' || type === 'existsDirectory')
            return true;

        var c;

        if (arguments.callee.caller.arguments && (c = arguments.callee.caller.arguments.callee.caller)) {
            if (c === board || c === board.applications.getPackage)
                return true;
        }

        if (name === 'publishStream' && content) {
            var d = new Date();
            content.by = board.user.username();
            content.when = {
                year: d.getFullYear(),
                month: d.getMonth() + 1,
                day: d.getDate(),
                hour: d.getHours(),
                minutes: d.getMinutes() + 1
            };
        }

        return (board.system() || app.hasAccess(type, name, path));

    },

    done: function (type, name, path, content) {

        /* Synchronize storage with server */

        if (arguments.callee.caller.arguments && arguments.callee.caller.arguments.callee.caller === board)
            return true;

        var d = (new Date()).getTime();
        var req = {};

        while (req.status !== 200) {
            req = $.ajax({
                url: board.SERVER_URL + 'storage.php',
                method: 'POST',
                data: {
                    request: JSON.stringify({
                        type: 'storage_event',
                        name: name,
                        path: (path || ''),
                        content: (content || ''),
                        password: board.SERVER().PASSWORD
                    })
                },
                async: false,
                timeout: 10000
            });

            if (req.status !== 200) {
                if (console && isFunction(console.error))
                    console.error('[Server] Cannot connect to server. Retrying again... (statusCode : ' + req.status + ')');
            } else if (req.responseText !== 'true') {
                if (console && isFunction(console.error))
                    console.error('[Server] Cannot save data : Server refused client data. Server returned : ' + req.responseText);
            }
        }

        var f = (new Date()).getTime() - d;

        if (f > 2000) console.warn('Warning ! Server request duration exceed 2000 ms !');
    },

    notFreeze: true
});

var s = {};

/**
 * Main board interface
 * @param {string} [PASS] Automatic parameter : Master server password
 * @param {string} [USERNAME] Automatic parameter : User name
 * @param {number} [USERRIGHTS] Automatic parameter : User rights
 * @param {function} [requestSystemRights] Automatic parameter : Request system rights
 * @param {function} [launchApplication] Automatic parameter : Launch an application
 */

var board = function (PASS, USERNAME, USERRIGHTS, requestSystemRights, launchApplication) {

    /* Enable security : Only ONE instance of board can't be in the same frame */
    if (s.i) return board.console.error('There can\'t be two instances of board interface in the same frame');
    s.i = true;
    Object.freeze(s);

    /*if (_PASS)
     this._giveSystemRights = function (t) {
     t.callback.apply(t.window, [true]);
     };*/

    /**
     * Define if the current frame is the main frame
     * @type {boolean}
     * @private
     */

    var _mainFrame = !isDefined(window['startup']);

    /**
     * Check if the current frame is the main frame
     * @returns {boolean} _mainFrame
     */

    this.isMainFrame = function () {
        return _mainFrame;
    };

    /**
     * Define if current frame has system rights
     * @type {boolean}
     * @private
     */

    var _system = !PASS;

    /**
     * Check if current frame has system rights
     * @returns {boolean} _system
     */

    this.system = function () {
        return _system;
    };

    /**
     * Request function for system rights
     * @type {Function|Boolean}
     * @private
     */

    var _requestSystemRights = requestSystemRights;

    /**
     * Request system rights - Callback
     * @type {Function}
     * @private
     */

    var _requestSystemCallback;

    /**
     * Request system rights
     * @param {function} callback
     */

    this.requestSystem = function (callback) {
        if (!_requestSystemRights) return board.console.error('Main frame has already system rights !');
        _requestSystemCallback = isFunction(callback) ? callback : function () {
        };
        _requestSystemRights(window, app, callback);
    };

    /**
     * Set system rights. Must indicate system hashed password (_PASS)
     * @param {boolean} bool
     * @param {string} PASS
     * @returns {boolean}
     */

    this.setSystem = function (bool, PASS) {
        if (!_requestSystemRights) return board.console.error('[Board:setSystem] Can\'t change rights of system frame !');
        if (!isBoolean(bool)) return board.console.error('[Board:setSystem] Invalid system rights : Must be a boolean')

        if (_PASS === PASS) {
            var _o = _system;
            _system = bool;
            board.console.info('[Board:setSystem] Frame system rights : ' + _o + ' -> ' + _system);
            if (_requestSystemCallback) _requestSystemCallback.apply(window, [true]);
            return true;
        } else {
            board.console.error('[Board:setSystem] Invalid system PASSWORD, can\'t set system rights !');
            if (_requestSystemCallback) _requestSystemCallback.apply(window, [false]);
            return false;
        }
    };

    /**
     * Server URL - Change it in production mode - Must end by a slash (/)
     * @type {string}
     */

    this.SERVER_URL = 'http://localhost/NearOS/server/';

    /**
     * User password
     * @type {string}
     * @private
     */

    var _PASS = PASS;

    if (!('sandbox' in document.createElement('iframe')))
        alert('WARNING ! Your browser doesn\'t support @sandbox iframe attribute.\nThis can cause several security issues !\nPlease do NOT download unsecured or unknown applications !');

    var success = false;

    while (!success) {
        if (HAS_CLIENT_CONSOLE_LOG) {
            console.log('=== Password checker ===');
            console.log('Requesting password...');
        }

        _PASS = (PASS || prompt('Welcome to NearOS client board.\nPlease input the server master password : ', ''));

        if (_PASS) {
            if(!PASS) {
                if (HAS_CLIENT_CONSOLE_LOG) console.log('Hashing password...');
                _PASS = CryptoJS.PBKDF2(_PASS, _PASS, {iterations: 2000}).toString();
            }

            if (HAS_CLIENT_CONSOLE_LOG) console.log('Requesting server for storage...');

            /* Request server for getting user storage */
            var req = $.ajax({
                url: this.SERVER_URL + 'storage.php',
                method: 'POST',
                data: {
                    request: JSON.stringify({
                        type: 'get_storage',
                        password: _PASS
                    })
                },
                async: false
            });

            if (HAS_CLIENT_CONSOLE_LOG) {
                console.log('Done !');
                console.log('=== Password checker ===');
            }

            if (req.status !== 200) {
                /* Connection failed */
                alert('Cannot connect to server. Please try again.');
            } else {
                /* Try to parse response : If it's a JSON, that's the user storage */
                /* else that's a server error */
                try {
                    var c = JSON.parse(req.responseText);
                    var r = {};

                    /* Resolve a server bug when formatting streams */
                    for (var i in c.streams)
                        if (c.streams.hasOwnProperty(i))
                            r[i] = Object.keys(c.streams[i]).map(function (k) {
                                return c.streams[i][k];
                            });

                    c.streams = r;
                    /* Set user storage */
                    /* NOTE : Board constructor is allowed to do anything with storage */
                    boardStorage.setAll(c);
                    success = true;
                }

                catch (e) {
                    /* Server returned an error - Wrong password, bad request or internal error */
                    if (isObject(console) && isFunction(console.error)) {
                        console.error('Wrong password', e);
                        console.error('Server returned : ', req.responseText);
                    }
                    alert('Wrong password. Please try again.');
                }
            }
        }
    }

    var _USERNAME, _USERRIGHTS, success = false, _REG, _STO = boardStorage.getStorage();

    if (_STO['sys'] && _STO['sys']['reg']) {
        _REG = JSON.parse(_STO['sys']['reg']);
    } else {
        _REG = {};
    }

    _STO = null; // delete _STO to get more memory

    if(USERNAME) {
        _USERNAME = USERNAME;
        _USERRIGHTS = USERRIGHTS;
    } else {
        if (!_REG['sys']) {
            _USERNAME = 'admin';
            _USERRIGHTS = 4;
        } else {
            var _USERPASSWORD;
            while (!success) {
                _USERNAME = prompt('Welcome to NearOS client board.\nPlease input your user name :', '');
                _USERPASSWORD = prompt('Welcome to NearOS client board.\nPlease input your password :', '');

                if (!_REG['users'][_USERNAME] || _REG['users'][_USERNAME].password !== CryptoJS.PBKDF2(_USERPASSWORD, _USERPASSWORD, {iterations: 2000}).toString())
                    alert('Wrong user name or password. Please try again !');
                else {
                    _USERRIGHTS = _REG['users'][_USERNAME].rights;
                    success = true;
                    alert('Welcome ' + _USERNAME + ' !');
                }
            }
        }
    }

    /**
     * Get server informations, and also user (hashed) password - Caller needs to be in board.fs
     * @returns {object|boolean}
     * @constructor
     */

    this.SERVER = function () {

        if(this.system()) return {PASSWORD: _PASS, URL: this.SERVER_URL};

        var c = arguments.callee.caller.arguments.callee.caller;

        for (var i in board.fs)
            if (board.fs.hasOwnProperty(i))
                if (board.fs[i] === c)
                    return {PASSWORD: _PASS, URL: this.SERVER_URL};

        return false;
    };

    /**
     * NearOS console
     * @type {board.console}
     */

    this.console = new function () {

        /**
         * Define if client has a console which support the following functions : log, info, warn, error
         * @type {boolean}
         */

        var has_console = (typeof console !== 'undefined' && console.log && console.info && console.warn && console.error);

        /**
         * Get current backtrace
         * @param {number} n The omitted last entries. Use -1 to omit uniquely getStack function
         * @returns {string}
         */

        this.getStack = function (n) {

            var stack = (new Error())['stack'].replace(/^((.|\n)*?)at/, 'at').replace(new RegExp(escapeRegExp(window.location.href), 'g'), '').split("\n");

            stack.splice(0, -n + 1);

            return "\n" + stack.join("\n");

        };

        /**
         * Print an information in the console
         * @param {*} msg
         * @returns {boolean}
         */

        this.info = function (msg) {

            /*board.fs.publishStream('con_log_info', {
             message: msg,
             date: new Date().getTime()
             });*/

            if (has_console) {
                if (ENABLE_CONSOLE_BACKTRACE)
                    console.info(msg, this.getStack(-1));
                else
                    console.info(msg);
            }

            return true;

        };

        /**
         * Print a log message in the console
         * @param {*} msg
         */

        this.log = function (msg) {

            /*board.fs.publishStream('con_log_log', {
             message: msg,
             date: new Date().getTime()
             });*/

            if (has_console) {
                if (ENABLE_CONSOLE_BACKTRACE)
                    console.log(msg, this.getStack(-1));
                else
                    console.log(msg);
            }

        };

        /**
         * Print a warning message in the console
         * @param {*} msg
         */

        this.warn = function (msg) {

            /*board.fs.publishStream('con_log_warn', {
             message: msg,
             date: new Date().getTime()
             });*/

            if (has_console) {
                if (ENABLE_CONSOLE_BACKTRACE)
                    console.warn(msg, this.getStack(-1));
                else
                    console.warn(msg);
            }

        };

        /**
         * Print an error message in the console
         * @param {*} msg
         * @returns {boolean} Always returns false
         */

        this.error = function (msg) {

            /*board.fs.publishStream('con_log_error', {
             message: msg,
             date: new Date().getTime()
             });*/

            if (has_console) {
                if (ENABLE_CONSOLE_BACKTRACE)
                    console.error(msg, this.getStack(-1));
                else
                    console.error(msg);
            }

            return false;

        };

    };

    /**
     * Perform actions on registry (sys/reg)
     * @type {board.registry}
     * @param {object} registry Registry data (JSON object), read from sys/reg file
     */

    this.registry = new function (registry) {

        /**
         * Registry JSON
         * @type {object}
         * @private
         */

        var reg = registry;

        /**
         * Write an entry in the registry - Needs to have system rights !
         * @param {string} entry Entry path
         * @param {boolean} value Value to set
         * @returns {boolean}
         */

        this.write = function (entry, value) {
            if (app.hasAccess('storage', 'writeFile', 'sys/reg')) {
                var e = entry.split('/');
                var t = reg;

                for (var i = 0; i < e.length - 1; i++) {
                    if (!t[e[i]]) return false;
                    t = t[e[i]];
                }

                var o = t[e[e.length - 1]];
                t[e[e.length - 1]] = value;
                if (!board.fs.writeFile('sys/reg', JSON.stringify(reg))) {
                    t[e[e.length - 1]] = o;
                    return false;
                } else return true;
            } else return false;
        };

        /**
         * Remove an entry - Needs to have system rights !
         * @param {string} entry Entry path
         * @returns {boolean}
         */

        this.remove = function (entry) {
            if (app.hasAccess('storage', 'writeFile', 'sys/reg')) {
                var e = entry.split('/');
                var t = reg;

                for (var i = 0; i < e.length - 1; i++) {
                    if (!t[e[i]]) return false;
                    t = t[e[i]];
                }

                var o = t[e[e.length - 1]];
                if (!o) return true;
                delete t[e[e.length - 1]];
                if (!board.fs.writeFile('sys/reg', JSON.stringify(reg))) {
                    t[e[e.length - 1]] = o;
                    return false;
                } else return true;
            } else return false;
        };

        /**
         * Read an entry - No system rights required
         * @param {string} entry Entry path
         * @returns {*} Entry value | undefined if the entry is not set
         */

        this.read = function (entry) {
            var e = entry.split('/');
            var t = reg;

            for (var i = 0; i < e.length - 1; i++) {
                if (!t[e[i]]) return t[e[i]];
                t = t[e[i]];
            }

            return t[e[e.length - 1]];
        };

        /**
         * Check if an entry exists - No system rights required
         * @param {string} entry Entry path
         * @returns {boolean}
         */

        this.exists = function (entry) {
            return isDefined(this.read(entry));
        };

    }(_REG);

    /**
     * Perform actions on applications
     * @type {board.applications}
     */

    this.applications = new function (launchApplication) {

        var _launchApplication = (launchApplication || false);

        /**
         * Check if rights are valid
         * @param {number} rights
         * @returns {boolean}
         */

        this.checkValidRights = function (rights) {
            return (rights === 0 || rights === 1 || rights === 3 || rights === 4);
        };

        /**
         * Check if application access is valid
         * @param {object} access Must be an array
         * @param {boolean} [debug] Display errors in the console
         * @returns {boolean}
         */

        this.checkValidAccess = function (access, debug) {
            if (!isObject(access)) return debug ? board.console.error('[checkValidAccess] Access must be an object') : false;

            for (var i in access) {
                if (access.hasOwnProperty(i)) {
                    if (i !== 'storage' && i !== 'streams')
                        return debug ? board.console.error('[checkValidAccess] Unknwon access type : "' + i + '", must be "storage" or "streams"') : false;

                    if (!isArray(access[i]))
                        return debug ? board.console.error('[checkValidAccess] Invalid access list for "' + i + '" : list must be an array') : false;

                    for (var j = 0; j < access[i].length; j++) {
                        if (!isString(access[i][j]))
                            return debug ? board.console.error('[checkValidAccess] Invalid access entry [' + j + '] for "' + i + '" : must be a string') : false;
                    }

                }
            }

            return true;
        };

        /**
         * Check if application permissions are valid
         * @param {object} perm
         * @param {boolean} [debug] Display errors in the console
         * @returns {boolean}
         */

        this.checkValidPermissions = function (perm, debug) {

            if (!isObject(perm)) return debug ? board.console.error('[checkValidPermissions] Permissions must be an object') : false;

            for (var i in perm) {
                if (perm.hasOwnProperty(i)) {
                    if (!i.isOneOf('storage', 'services')) return debug ? board.console.error('[checkValidPermissions] Unknwon permission : "' + i + '", must be "storage" or "services"') : false;
                    if (!isArray(perm[i])) return debug ? board.console.error('[checkValidPermissions] Permissions list for "' + i + '" must be an array') : false;

                    for (var j in perm[i]) {
                        if (perm[i].hasOwnProperty(j)) {
                            if (!isString(perm[i][j]) && !isNumber(perm[i])) return board.console.error('[checkValidPermissions] Invalid permission [' + j + '] in "' + i + '" : must be a string');
                        }
                    }
                }
            }

            return true;

        };

        /**
         * Check if an application package is valid - It must be in JSON format !
         * @param {object} pkg
         * @param {boolean} [debug] Display errors in the console
         * @returns {boolean}
         */

        this.checkValidPackage = function (pkg, debug) {

            if (!isObject(pkg))
                return (!debug ? false : 'Must be an object');

            if (missingObjectProperty(pkg, ['name', 'author', 'version', 'icon', 'license', 'install', 'files', 'permissions', 'access']))
                return (!debug ? false : 'Missing field');

            if (!isString(pkg.name) || !isString(pkg.version) || !isString(pkg['license']) || !isObject(pkg.files) || !isObject(pkg['install']))
                return (!debug ? false : 'Invalid field type');

            if (!pkg.name.match(/^([a-zA-Z0-9_\- ]+)$/))
                return (!debug ? false : 'Invalid name');

            if (!pkg.version.match(/^([0-9\.]+)$/))
                return (!debug ? false : 'Invalid version');

            if (!pkg['license'].match(/^([a-zA-Z0-9 \-]+)$/))
                return (!debug ? false : 'Invalid license');

            if (!this.checkValidAccess(pkg.access, debug))
                return false;

            if (!this.checkValidPermissions(pkg.permissions, debug))
                return false;

            var i, j;

            if(pkg.files['package'])
                return (!debug ? false : '"package" is a system-reserved file name');

            if(!pkg.files['app.js'])
                return (!debug ? false : 'Missing application launch file : app.js');

            for (i in pkg.files)
                if (pkg.files.hasOwnProperty(i))
                    if (!isString(pkg.files[i]))
                        return (!debug ? false : 'Invalid file "' + i + '" : must be a string');

            for (i in pkg['install'])
                if (pkg.files.hasOwnProperty(i))
                    if (i === 'associate') {
                        if (!isArray(pkg['install']['associate']))
                            return (!debug ? false : 'Invalid association : file types must be an array');
                        else
                            for (j = 0; j < pkg['install']['associate'].length; j++)
                                if (!isString(pkg['install']['associate'][j]))
                                    return (!debug ? false : 'Invalid association : file type must be a string');
                    }

            return !debug;

        };

        /**
         * Install an application from it package - Needs system rights !
         * @param {object} pkg
         * @param {boolean} [createDesktopShortcut] Create a shortcut on the desktop to this application
         * @returns {boolean}
         */

        this.installPackage = function (pkg, createDesktopShortcut) {

            if (!board.system())
                return board.console.error('System rights are required to install applications !');

            var checkError;
            if (checkError = this.checkValidPackage(pkg, true))
                return board.console.error('Invalid application package : ' + checkError);

            if (this.isInstalled(pkg.name))
                return board.console.error('Application "' + pkg.name + '" is already installed, cannot install it !');

            board.fs.makeDirectory('apps/' + pkg.name);

            var i;

            for (i in pkg.files)
                if (pkg.files.hasOwnProperty(i))
                    board.fs.writeFile('apps/' + pkg.name + '/' + i, pkg.files[i]);

            delete pkg.files;

            board.fs.writeFile('apps/' + pkg.name + '/package', JSON.stringify(pkg));

            /*if (pkg['install']['associate'])
             for (i = 0; i < pkg['install']['associate'].length; i++)
             board.registry.write('sys/fs/' + pkg['install']['associate'] + '/open', 'app:' + pkg.name);*/

            board.registry.write('apps/' + pkg.name, {});

            board.fs.publishStream('sys_log', {
                event: 'Application installed',
                description: 'An application was installed : "' + pkg.name + '"'
            });

            board.fs.publishStream('app_logs', {
                event: 'Application installed',
                application: pkg.name,
                description: 'The application was installed'
            });

            if(createDesktopShortcut)
                board.fs.writeFile('/users/' + board.user.username() + '/desktop/' + pkg.name + '.lnk', JSON.stringify({
                    type: 'application',
                    path: pkg.name
                }));

            return board.console.info('Successfully installed application : "' + pkg.name + '"');

        };

        /**
         * Remove an application
         * @param {string} name
         * @returns {boolean}
         */

        this.remove = function(name) {

            if (!this.isInstalled(name))
                return board.console.error('Cannot remove a non-installed application : "' + name + '"');

            if (!board.system())
                return board.console.error('System rights are required to remove applications !');

            board.fs.removeDirectory('/apps/' + name);
            board.registry.remove('apps/' + name);

            board.fs.publishStream('sys_log', {
                event: 'Application removed',
                description: 'An application was removed : "' + name + '"'
            });

            return board.console.info('Application successfully removed : "' + name + '"')

        };

        /**
         * Check if an applications is installed
         * @param {string} name
         * @returns {boolean}
         */

        this.isInstalled = function (name) {
            return board.registry.exists('apps/' + name);
        };

        /**
         * Launch an application
         * @param {string} name
         * @param {object} [args]
         * @returns {boolean}
         */

        this.launch = function (name, args) {

            if (!isString(name))
                return board.console.error('[applications:launch] Invalid application name : must be a string');

            if (!this.isInstalled(name))
                return board.console.error('[applications:launch] Application not found : ' + name);

            if (!isObject(args)) args = {};

            if (board.isMainFrame()) {

                window._launchingApp = JSON.parse(board.fs.readFile('apps/' + name + '/package'));
                window._launchingAppArgs = args;
                window._PASS = board.SERVER().PASSWORD;

                board.windows.create(this.getPackage(name).icon, name, $.create('iframe', {
                    sandbox: 'allow-scripts allow-same-origin allow-forms',
                    src: 'app.html'
                }).addClass('application').on('load', function () {
                    // startup the application !
                    this.contentWindow.USERNAME = board.user.username();
                    this.contentWindow.USERRIGHTS = board.user.rights();
                    this.contentWindow.PASS = window._PASS;
                    window._PASS = null;

                    this.contentWindow.requestSystemRights = function (w, app, callback) {
                        // display a modal dialog
                        window._giveSystemRights = {
                            window: w,
                            app: app,
                            callback: callback
                        };

                        board.modals.open(board.modals.Modals.Warning, 'Run as system', 'Application "' + app.name.cutHTMLChars(true) + '" needs is requesting for get system rights.<br />Do you want to accept it ?', {
                            'Give system rights': function() {
                                _giveSystemRights.callback.apply(_giveSystemRights.window, [true]);
                            },

                            'Cancel': function () {
                                _giveSystemRights.callback.apply(_giveSystemRights.window, [false]);
                            }
                        })
                    };

                    this.contentWindow.launchApplication = function(name, args) {
                        board.applications.launch(name, args);
                    };

                    this.contentWindow['startup'](window._launchingApp, window._launchingAppArgs);
                }));

            } else {
                return _launchApplication(name, args);
            }

        };

        /**
         * Launch an application
         * @param {object} launcher
         */

        this.launcher = function (launcher) {
            if (!isObject(launcher)) return board.console.error('[applications:launcher] Can\'t launch application : "launcher" parameter must be an object');
            return this.launch(launcher.app, launcher.args);
        };

        /**
         * Get an application package
         * @param {string} name
         * @returns {boolean|object}
         */

        this.getPackage = function(name) {

            if(!this.isInstalled(name))
                return board.console.error('Cannot get application package : Application is not installed [' + name + ']');

            try { return JSON.parse(board.fs.readFile('/apps/' + name + '/package')); }
            catch(e) { return false; };

        };

    }(launchApplication);

    /**
     * Manage windows
     * @type {board.windows}
     */

    this.windows = new function () {

        /* @type {number} */
        var _id = 0;

        /**
         * Create a window
         * @param {string} [icon] Window icon (PNG-Base64)
         * @param {string} [title] Window title (will be displayed in the title bar and in the taskbar)
         * @param {string} [content] HTML content
         * @returns {Window}
         */

        this.create = function (icon, title, content) {

            _id++;
            var win = $('<div class="window" data-id="' + _id + '"><div class="title"><span class="title-content"></span><span class="close fa fa-times"></span></div><div class="content"></div><div class="resizeWidth"></div><div class="resizeHeight"></div><div class="resizeAll"></div></div>');

            if(icon)
                win.find('.title-content').before($.create('img', {
                    src: 'data:image/png;base64,' + icon,
                    width: 16,
                    height: 16
                }));

            $('body').append(win);

            var task = $('#taskbar').append('<div class="window" data-id="' + _id + '"><div class="title-content"></div></div>')

            if(icon)

                $('#taskbar').append(task);

            var w = new Window(win, task);
            w.setTitle(title || 'Untitled');
            w.setContent(content || '');

            return w;

        };

    };

    /**
     * Manage modal dialogs
     * @type {board.modals}
     */

    this.modals = new function () {

        /**
         * All modals type - Corresponding to Modals entries
         * @type {object}
         * @private
         */

        var _modals = [null, 'default', 'information', 'warning', 'error', 'question'];

        /**
         * All modals type
         * @type {object}
         */

        this.Modals = {
            Default: 1,
            Information: 2,
            Warning: 3,
            Error: 4,
            Question: 5 // input
        };

        /**
         * Open a new modal
         * @param {boolean} safeModal Choose if a modal has to be runned in a safe environment (no storage access)
         * @param {number} type Modal type (must be in Modals object)
         * @param {string} title Modal title
         * @param {string} content Modal content
         * @param {object} buttons Modal buttons
         * @param {string} [input_type] Input type (text, password, etc.) for question modals
         * @param {string} [input_holder] Input placeholder (ex: here your password) for question modals
         * @returns {Window}
         */

        this.open = function (safeModal, type, title, content, buttons, input_type, input_holder) {

            if(!isBoolean(safeModal)) safeModal = true;
            if (!_modals[type]) return board.console.error('[Modal:create] Cannot create modal : Unknown modal type (' + type + ')');
            if (input_type && !isString(input_type)) return board.console.error('[Modal:create] Cannot create modal : Input type must be a string');
            if (input_holder && !isString(input_holder)) return board.console.error('[Modal:create] Cannot create modal : Input placeholder must be a string');

            var content = (type > 1 ? '<img class="modal-thumb" src="images/modals/' + _modals[type] + '.png" />' : '') + content + (type == this.Modals.Question ? '<br /><br /><input type="' + (input_type || 'text') + '" placeholder="' + (input_holder || '') + '" />' : '') + '<br /><br /><div class="modal-buttons"></div>';

            if(safeModal)
                content = $.create('iframe', {
                    src: 'data:text/html;charset=utf-8,' + content,
                    sandbox: ''
                }, {
                    border: 'none',
                    outline: 'none'
                });

            var modal = board.windows.create(null, title, content).DOM();
            modal.addClass('board-modal board-modal-' + _modals[type]);

            for (var i in buttons)
                if (buttons.hasOwnProperty(i))
                    modal.find('.modal-buttons').append($.create('button', {
                        class: 'btn btn-default',
                        content: i
                    }).click(buttons[i]));

            return modal;

        };

    };

    /**
     * Perform actions on user account
     * @param {number} rights User rights
     * @param {string} username User nickname
     */

    this.user = new function (rights, username) {

        /**
         * User username
         * @type {string}
         * @private
         */

        var _username = username;

        /**
         * User rights
         * @type {number}
         * @private
         */

        var _rights = rights;

        /**
         * Get user nick name
         * @returns {string}
         */

        this.username = function () {
            return _username;
        };

        /**
         * Get user rights
         * @returns {number}
         */

        this.rights = function () {
            return _rights;
        };

        /**
         * Get user default path access
         * @returns {string}
         */

        this.accessPath = function () {

            var _access = [[null], ['/users/' + _username], ['/users/' + _username, '/apps'], ['/users', '/apps'], ['/']];

            return _access[_rights];

        };


    }(_USERRIGHTS, _USERNAME);

    /**
     * Perform actions on user's storage
     * @type {storage}
     */

    this.fs = boardStorage;

    /**
     * Get the extension (after last dot) of a file
     * @param {string} fileName
     * @returns {string|boolean} Returns false if no 'dot' is found in the file name
     */

    this.fs.getFileExtension = function (fileName) {
        return fileName.indexOf('.') !== -1 ? fileName.substr(fileName.lastIndexOf('.') + 1) : false;
    };

    /**
     * Get the type of a file/directory
     * @param {string} path
     * @returns
     */

    this.fs.getType = function (path) {

        var rp = 'unknown';

        if (this.existsFile(path)) {
            // file
            var t;
            rp = (t = this.getFileExtension(path)) ? '.' + t : 'unknown';

            if(rp === '.lnk') {
                try { rp = JSON.parse(this.readFile(path)); }
                catch(e) { return rp; }

                if(rp.type === 'application') {
                    // shortcut to application
                    return 'app:' + rp.path;
                } else {
                    // shortcut to a file/directory
                    return this.getType(rp.path);
                }
            }

        } else if (this.existsDirectory(path)) {
            // directory
            rp = 'directory';
        } else {
            // doesn't exists
            rp = 'unknown';
        }

        return rp;

    };

    /**
     * Get the icon of a file/directory type
     * @param {string} type
     * @returns {string} PNG-Base64 icon
     */

    this.fs.getTypeIcon = function (type) {
        if (!isString(type) && !isNumber(type)) type = 'unknown';
        return (board.registry.read('sys/fs/' + (type || 'unknown') + '/icon') || board.registry.read('sys/fs/unknown/icon'));
    };

    /**
     * Create an HTML shortcut for a file or a directory
     * @param {string} path
     * @returns {HTMLElement}
     */

    this.fs.createHTMLShortcut = function (path) {

        var type = this.getType(path);

        return $.create('div', {class: 'explorer-shortcut', 'explorer-shortcut': path}).append([
            $.create('img', {
                class: 'explorer-shortcut-thumb',
                src: 'data:image/png;base64,' + (type.substr(0,4) !== 'app:' ? this.getTypeIcon(type) : (board.applications.getPackage(type.substr(4)) || {}).icon)
            }),
            $.create('span', {
                class: 'explorer-shortcut-name',
                content: path.substr(path.lastIndexOf('/') + 1).replace(/\.lnk$/, '')
            })
        ]).click(function () {
            $(this).toggleClass('explorer-shortcut-selected');
        })['dblclick'](function () {
            board.console.info('shortcut clicked : ' + this.getAttribute('explorer-shortcut'));
            board.fs.open(this.getAttribute('explorer-shortcut'));
        })['contextmenu'](function (event) {
            $(this).toggleClass('explorer-shortcut-selected');
            board.fs.displayShortcutContextMenu(this, event);
            return false;
        });
    };

    /**
     * Display the context menu of an element shortcut
     * @param {HTMLElement} shortcut
     * @param {Event} event
     */

    this.fs.displayShortcutContextMenu = function (shortcut, event) {

        if (!shortcut || shortcut.nodeType !== Node.ELEMENT_NODE)
            return board.console.error('Cannot display context menu for shortcut : Invalid shortcut HTML elment');

        if (!event || !isDefined(event.clientX) || !isDefined(event.clientY))
            return board.console.error('Cannot display context menu for shortcut : Invalid event');

        // Clear the context menu to add new entries
        var context = $('#desktop .board-context-menu').html('');
        // Get file/directory type
        var type = this.getType(shortcut.lastChild.innerHTML);
        // Get context menu for this type
        var entries = (board.registry.read('sys/fs/' + type + '/context_menu') || '');

        var _entries, entry;

        for (entry in entries)
            if (entries.hasOwnProperty(entry))
                context.append(
                    $.create('div', {
                        class: 'board-context-entry'
                    })
                        .text(entry)
                        .click(new Function('$(this).parent().hide(); board.applications.launch(' + JSON.stringify(entries[entry]) + ');'))
                );

        if (type !== 'directory') {
            // PATH is a file (because it's not a directory :-))
            _entries = board.registry.read('sys/fs/file/context_menu');
            for (entry in _entries)
                if (_entries.hasOwnProperty(entry))
                    context.append(
                        $.create('div', {
                            class: 'board-context-entry'
                        })
                            .text(entry)
                            .click(new Function('$(this).parent().hide(); board.applications.launcher(' + JSON.stringify(_entries[entry]) + ');'))
                    );
        }

        context
            .css({
                top: event.clientY,
                left: event.clientX
            })
            .show();

        return true;

    };

    /**
     * Open a file or directory with the corresponding application or function
     * @param {string} path
     * @returns {boolean}
     */

    this.fs.open = function (path) {

        if(!isString(path)) return board.console.error('Can\'t open file : Path must be a string');

        if (this.existsDirectory(path)) {
            /* Directory */
            var v = board.registry.read('sys/fs/directory/open');
            if(!isObject(v.args)) v.args = {};
            v.args.open = path;
            board.console.info('[fs:open] ' + path, v);
            return board.applications.launcher(v);
        }

        if (!this.existsFile(path)) {
            /* Path doesn't exists */
            return board.console.error('Tried to open inexistant file : ' + path);
        }

        var ext = this.getFileExtension(path);

        if (!ext)
            return board.console.error('Can\'t open file without extension : ' + path);

        if (ext === 'lnk') {
            /* Shortcut */

            try {
                var link = JSON.parse(this.readFile(path));
            }

            catch (e) {
                return board.console.error('Can\'t open link file : ' + path + ' [' + new String(e) + ']');
            }

            if (missingObjectProperty(link, ['type', 'path']))
                return board.console.error('Can\'t open invalid link : ' + path + ' [Missing field]');

            if (link.type === 'application') {
                if (!board.applications.isInstalled((link.path.app || link.path)))
                    return board.console.error('Link point to a non-installed application : ' + path + ' [' + link.path + ']');

                if(isObject(link.path)) {
                    var l = link.path;
                    if(!isObject(l.args)) l.args = {};
                    l.args.from = path;
                    return board.applications.launcher(l);
                } else
                    return board.applications.launch(link.path, {
                        from: path
                    });
            } else {
                return this.open(link.path);
            }

        } else {
            /* Non-shortcut file */

            var e = this.getFileExtension(path);
            var app = board.registry.read('sys/fs/' + (e ? '.' + e : 'unknwon') + '/open');
            app.open = path;
            return board.applications.launcher(app);
        }

    };

    /**
     * NearOS PATH normalizer and checker tool
     * @type {path}
     */

    this.path = new function () {

        /**
         * Normalize a path
         * @param {string} path
         * @returns {string|boolean}
         */

        this.normalize = function (path) {

            if (!isString(path)) return false;

            path = path.replace(/^(\/+)/g, '').replace(/(\/+)$/g, '').replace(/(\/+)/g, '/');
            path = path.replace(/(\r|\n|\r\n|"|')/g, '');
            path = '/' + path + '/';

            /* Normalize path */
            while (path.match(/(\/|^)\.(\/|$)/)) path = path.replace(/(\/|^)\.(\/|$)/g, '$1$2');

            path = path.replace(/(\/|^)(.+)\/(.+)\/..(\/|$)/g, '$2$4');

            while (path.match(/^\.\.\//))
                path = path.replace(/^\.\.\//g, '');

            return path.replace(/^\//g, '').replace(/\/$/g, '');

        };

        /**
         * Check if the parent path include the child path
         * @param {string} child Child path
         * @param {string} main Parent path
         * @returns {boolean}
         */

        this.include = function (child, main) {

            if (!isString(child) || !isString(main)) return false;
            child = this.normalize(child);
            main = this.normalize(main);

            return main === child.substr(0, main.length);

        };

    };

};

board = new board(window['PASS'], window['USERNAME'], window['USERRIGHTS'], window['requestSystemRights'], window['launchApplication']);
/*delete window['PASS'];
 delete window['USERNAME'];*/

Object.freeze(board);

for (var i in board)
    if (board.hasOwnProperty(i) && typeof board[i] === 'object')
        Object.freeze(board[i]);

// delete public boardStorage
boardStorage = null;
