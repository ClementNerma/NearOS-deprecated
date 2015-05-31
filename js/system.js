
var System = {
    name: 'NearOS',
    developers: ['Clément Nerma'],
    thanksTo: ['motezazer'],

    hasAccess: function(type, name, path) {

        if(!isString(type)) return board.console.error('[System:hasAcess] Cannot evaluate access : Invalid type, must be a string');
        if(!isString(name)) return board.console.error('[System:hasAcess] Cannot evaluate access : Invalid name, must be a string');
        if(!isString(path)) return board.console.error('[System:hasAcess] Cannot evaluate access : Invalid path, must be a string');

        if(!app.permissions()[type] || !app.permissions()[type][name] && app.permissions()[type]['*']) return false;

        var acc = app.access();

        if(type === 'storage') {
            if(!acc.storage) return false;

            if ((name === 'readFile' || name === 'readDirectory') && board.path.include(path, '/apps/' + app.name())) return true;

            if (acc.storage.indexOf('$USERACCESS$') !== -1) {
                var userAccessPath = board.user.accessPath();

                for (var i = 0; i < userAccessPath.length; i++) {
                    if (board.path.include(path, userAccessPath[i]))
                        return true;
                }
            }

            for (var i = 0; i < acc.storage.length; i++)
                if (acc.storage[i] !== '$USERACCESS$' && board.path.include(path, acc.storage[i]))
                    return true;

        } else if(type === 'streams') {
            return acc.streams && acc.streams.indexOf(type) !== -1;
        } else return board.console.error('[System:hasAccess] Unknown action type : ' + type);

        return false;
    }
};

Object.freeze(System);

for(var i in System)
    if(System.hasOwnProperty(i) && isObject(System[i]))
        Object.freeze(System[i]);
