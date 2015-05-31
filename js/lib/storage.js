
/**
 * Internal NearOS Storage API
 * License : MIT
 * Author  : Clément Nerma
 * Date    : 15 - 05 - 2015
 */

/**
 * Storage API library
 * @param {object} options
 * @constructor
 */

var storage = function(options) {

    function rightsError()  {

        return board.console.error('Cannot perform operation : needs more privileges !');

    }

    function notifyStream(name, type, value) {

        for(var i in _streamListeners[name]) {
            if(_streamListeners[name].hasOwnProperty(i)) {
                _streamListeners[name][i](type, value);
            }
        }

    }

    options = isObject(options) ? options : {};

    var _filter = isFunction(options.filter) ? options.filter : function(){return true;};
    var _done = isFunction(options.done) ? options.done : function(){return true;};

    var _streamListeners = {};

    var defaultStorage = isObject(options.defautStorage) ? options.defaultStorage : {
        data: {},
        streams: {}
    };

    var defaultStorageString = JSON.stringify(defaultStorage);

    var _storage = isObject(options.storage) ? cloneObject(options.storage) : cloneObject(defaultStorage);

    function set(key, value) {

        var w = _storage.data, way = key.split('/');

        for (var i = 0; i < way.length - 1; i++) {
            if (w[way[i]])
                w = w[way[i]];
            else
                return false;
        }

        w[way[way.length - 1]] = value;

        return true;

    };

    function get(key) {

        var w = _storage.data, way = key.split('/');

        for (var i = 0; i < way.length - 1; i++) {
            if (w[way[i]])
                w = w[way[i]];
            else
                return false;
        }

        return w[way[way.length - 1]];

    };

    function exists(key) {

        var w = _storage.data, way = key.split('/');

        for (var i = 0; i < way.length - 1; i++) {
            if (w[way[i]])
                w = w[way[i]];
            else
                return false;
        }

        return isDefined(w);

    };

    function remove(key) {

        var w = _storage.data, way = key.split('/');

        for (var i = 0; i < way.length - 1; i++) {
            if (w[way[i]])
                w = w[way[i]];
            else
                return false;
        }

        delete w[way[way.length - 1]];
        return true;

    };

    /* Storage */

    this.existsDirectory = function(path) {

        path = board.path.normalize(path);

        if(!_filter('storage', 'existsDirectory', path)) return rightsError();

        var g = get(path);
        return g && isObject(g);

    };

    this.makeDirectory = function(path) {

        path = board.path.normalize(path);

        if(!_filter('storage', 'makeDirectory', path)) return rightsError();

        var g = get(path);

        if(g && !isObject(g))
            return board.console.error('Cannot make a directory because it\'s a file : ' + path);

        if(isObject(g)) {
            board.console.log('Cannot make directory because it already exists : ' + path);
            return true;
        }

        set(path, {})
        _done('storage', 'makeDirectory', path);
        return true;

    };

    this.readDirectory = function(path) {

        path = board.path.normalize(path);

        if(!_filter('storage', 'readDirectory', path)) return rightsError();

        var g = get(path);

        if(g && !isObject(g))
            return board.console.error('Cannot read a file as a directory : ' + path);

        if(!isDefined(g))
            return board.console.error('Cannot read a non-existant directory : ' + path);

        return cloneObject(g);

    };

    this.removeDirectory = function(path) {

        path = board.path.normalize(path);

        if(!_filter('storage', 'removeDirectory', path)) return rightsError();

        var g = get(path);

        if(g && !isObject(g))
            return board.console.error('Cannot remove directory because it\'s a file : ' + path);

        if(!isDefined(g))
            return board.console.error('Cannot remove a non-existant directory : ' + path);

        remove(path);
        _done('storage', 'removeDirectory', path);
        return true;

    };

    this.existsFile = function(path) {

        path = board.path.normalize(path);

        if(!_filter('storage', 'existsFile', path)) return rightsError();

        var g = get(path);
        return g && !isObject(g);

    };

    this.writeFile = function(path, content) {

        path = board.path.normalize(path);

        if(!_filter('storage', 'writeFile', path, content)) return rightsError();

        if(isObject(content, true)) {
            try {
                content = JSON.stringify(content);
            }

            catch(e) {
                return board.console.error('Can\'t convert JSON to string for file writing : ' + path + ' [' + new String(e) + ']');
            }
        }

        if(!isString(content))
            return board.console.error('Can\'t write a non-string into a file : ' + path);

        if(this.existsDirectory(path))
            return board.console.error('Can\'t write a directory as a file : ' + path);

        set(path, content)
        _done('storage', 'writeFile', path, content);
        return true;

    };

    this.readFile = function(path) {

        path = board.path.normalize(path);

        if(!_filter('storage', 'readFile', path)) return rightsError();

        var g = get(path);

        if(isObject(g))
            return board.console.error('Cannot read a directory as a file : ' + path);

        if(!isDefined(g))
            return board.console.error('Cannot read a non-existant file : ' + path);

        return g;

    };

    this.removeFile = function(path) {

        path = board.path.normalize(path);

        if(!_filter('storage', 'removeFile', path)) return rightsError();

        var g = get(path);

        if(isObject(g))
            return board.console.error('Cannot remove file because it\'s a directory : ' + path);

        if(!isDefined(g))
            return board.console.error('Cannot remove a non-existant file : ' + path);

        _done('storage', 'removeFile', path);
        remove(path);
        return true;

    };

    this.existsDir = this.existsDirectory;
    this.mkdir = this.makeDirectory;
    this.readDir = this.readDirectory;
    this.rmdir = this.removeDirectory;

    this.write = this.writeFile;
    this.read = this.readFile;
    this.remove = this.removeFile;

    /* Streams */

    /**
     * Create a stream
     * @param {string} name
     * @param {boolean} [clearIfExists]
     * @returns {boolean}
     */

    this.createStream = function(name, clearIfExists) {

        if(!_filter('streams', 'createStream', name, clearIfExists)) return rightsError();

        if(_storage.streams[name]) {
            if(clearIfExists) {
                _storage.streams[name] = [];
                notifyStream(name, 'create');
                _done('streams', 'createStream', name);
            }
        } else {
            _storage.streams[name] = [];
            notifyStream(name, 'create');
            _done('streams', 'createStream', name);
        }

        return true;
    };

    /**
     * Read a stream
     * @param {string} name
     * @returns {object|boolean}
     */

    this.readStream = function(name) {

        if(!_filter('streams', 'readStream', name)) return rightsError();

        return (_storage.streams[name] || false);

    };

    /**
     * Check if a stream exists
     * @param {string} name
     * @returns {boolean}
     */

    this.existsStream = function(name) {

        if(!_filter('streams', 'existsStreams', name)) return rightsError();
        return Array.isArray(_storage.streams[name]);

    };

    /**
     * Remove a stream
     * @param {string} name
     * @returns {boolean}
     */

    this.removeStream = function(name) {

        if(!_filter('streams', 'removeStream', name)) return rightsError();

        delete _storage.streams[name];
        notifyStream(name, 'remove');
        _done('streams', 'removeStream', name);

        return true;

    };

    /**
     * Publish a content on a stream
     * @param {string} name
     * @param {number|string|object} content
     * @returns {boolean}
     */

    this.publishStream = function(name, content) {

        if(!_filter('streams', 'publishStream', name, content)) return rightsError();

        if(!_storage.streams[name])
            return false;

        _storage.streams[name].push(content);
        notifyStream(name, 'publish', content);
        _done('streams', 'publishStream', name, content);

        return true;

    };

    /**
     * Listen a stream
     * @param {string} name
     * @param {function} callback
     * @returns {boolean}
     */

    this.listenStream = function(name, callback) {

        if(!_filter('streams', 'listenStream', name, callback)) return rightsError();

        if(!_storage.streams[name])
            return false;

        if(!_streamListeners[name])
            _streamListeners[name] = [];

        _streamListeners[name].push(callback);
        return true;

    };

    /* Others */

    /**
     * Clear storage data and streams ! This cannot be undo !
     */

    this.clear = function() {
        var s = cloneObject(defaultStorage);
        if(!_filter(['storage', 'streams'], 'clear', '*', s)) return rightsError();
        storage = s;
        _done(['storage', 'streams'], 'clear', '*', s);
        return true;
    };

    /**
     * Get storage data and stream size
     * @returns {Number|undefined}
     */

    this.getSize = function() {

        return JSON.stringify(_storage).length;

    };

    /**
     * Get all storage
     */

    this.getStorage = function() {

        if(!_filter('storage', 'getStorage', '*')) return rightsError();

        return cloneObject(_storage.data);

    };

    /**
     * Get all streams
     */

    this.getStreams = function() {

        if(!_filter('streams', 'getStreams', '*')) return rightsError();

        return cloneObject(_storage.streams);

    };

    /**
     * Get all storage and streams
     */

    this.readAll = function() {

        if(!_filter(['storage', 'streams'], 'readAll', '*')) return rightsError();

        return cloneObject(_storage);

    };

    /**
     * Set all storage and streams
     * @param {object} storage
     */

    this.setAll = function(json) {

        if(!isObject(json)) return board.console.error('Cannot assign an object to storage : must be a JSON');
        if(!isObject(json.streams)) return board.console.error('Cannot assign an object to storage streams : must be a JSON');
        if(!isObject(json.data)) return board.console.error('Cannot assign an object to storage data : must be a JSON');

        if(!_filter(['storage', 'streams'], 'setAll', '*', json)) return rightsError();
        _storage = cloneObject(json);
        _done(['storage', 'streams'], 'setAll', '*', json);

        return true;

    }

    if(!options.notFreeze)
        Object.freeze(this);

}