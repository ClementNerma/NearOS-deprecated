
/* Create an HTML element */

$.create = function(tag, attr, css) {
    var c = (attr.content || '');
    delete attr.content;
    css = (css || {});
    return $(document.createElement(tag)).attr(attr).css(css).html(c);
};

/* Types and escapes functions */
function isDefined(v) { return typeof v !== 'undefined'; }
function isBoolean(v) { return typeof v === 'boolean'; }
function isString(v) { return typeof v === 'string'; }
function isNumber(v) { return typeof v === 'number'; }
function isInteger(v) { return Number.isInteger(v); }
function isSafeInteger(v) { return isFunction(Number.isSafeInteger) ? Number.isSafeInteger(v) : isInteger(v); }
function isObject(v, a) {
    if(a) { return isObject(v) || isArray(v); } else { return v && typeof v === 'object' && !Array.isArray(v); }
}
function isArray(v) { return Array.isArray(v); }
function isFunction(v) { return typeof v === 'function'; }
function escapeRegExp(string) { return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"); }
function cloneObject(e){var n;if(null==e||"object"!=typeof e)return e;if(e instanceof Date)return n=new Date,n.setTime(e.getTime()),n;if(e instanceof Array){n=[];for(var t=0,r=e.length;r>t;t++)n[t]=cloneObject(e[t]);return n}if(e instanceof Object){n={};for(var o in e)e.hasOwnProperty(o)&&(n[o]=cloneObject(e[o]));return n}throw new Error("Unable to copy obj! Its type isn't supported.")}
function missingObjectProperty(v, p) {
    for(var i in p)
        if(typeof v[p[i]] === 'undefined')
            return true;

    return false;
}

String.prototype.cutHTML = function() {
    return this.toString().replace(/<((.|\r|\n|\r\n)*?)>/g, '');
}

String.prototype.cutHTMLChars = function(cutLines) {
    var t = this.cutHTML().replace(/&/g, '').replace(/"/g, '').replace(/'/g, '');

    if(cutLines) {
        while(t.match(/(\r|\n|\r\n)/))
            t = t.replace(/(\r|\n|\r\n)/g, '');
    }

    if(t.indexOf('&') !== -1 || t.indexOf('"') !== -1 || t.indexOf('\'') !== -1)
        return t.cutHTMLChars(cutLines);

    return t;
};

String.prototype.contains = function(char) {
    return this.toString().indexOf(char) !== -1;
}

String.prototype.isOneOf = function() {
    var s = this.toString();

    for(var i = 0; i < arguments.length; i++)
        if(s == arguments[i])
            return true;

    return false;
};

Function.prototype.behove = function(obj) {
    for(var i in obj)
        if(obj.hasOwnProperty(i))
            if(obj[i] === this)
                return true;

    return false;
};

/* hasOwnProperty compatibility path */

Object.prototype.hasOwnProperty = function(prop) {
    var proto = this.__proto__ || this.constructor.prototype;
    return (prop in this) &&
        (!(prop in proto) || proto[prop] !== this[prop]);
};
