var _appsInst = false;

/**
 * Create an application data
 * @param {string} name
 * @param {Object} access
 * @param {Object} permissions
 * @param {number} rights (permissions level)
 * @constructor
 */

var Application = function(name, access, permissions) {

    if(_appsInst) return board.console.error('[System security] You cannot have more than one application instance in a same frame !');
    _appsInst = {};

    if(!isString(name))
        return board.console.error('Cannot create application : "name" must be a string');

    if(!board.applications.checkValidAccess(access, true))
        return board.console.error('Cannot create application : Invalid access');

    if(!board.applications.checkValidPermissions(permissions, true))
        return board.console.error('Cannot create application : Invalid permissions');

    var _name = name;
    var _access = access;
    var _perms = permissions;
    Object.freeze(_access);
    Object.freeze(_perms);

    this.name = function() { return _name; };
    this.permissions = function() { return _perms; };
    this.access = function() { return _access; };

    this.hasAccess = function(type, name, path) {
        return System.hasAccess(type, name, path);
    };

    Object.freeze(this);

};
