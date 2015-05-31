
/**
 * Create a database
 * @param {object} [content] The JSON database content
 * @constructor
 */

var DataBase = function(content) {

    var db = {};
    var uniqueUsed = {};

    if(isObject(content)) {
        if (!DataBase.checkValidJSON(content)) return false;
        db = content;

        for(var table in db.entries)
            if(db.entries.hasOwnProperty(table)) {
                uniqueUsed[table] = {};

                for (var i = 0; i < db.entries[table].length; i++)
                    for (var j = 0; j < db.entries[table][i].length; i++)
                        if (isDefined(db.entries[table][i][j]) && db.columns[db.column_orders[i]].unique)
                            uniqueUsed[table][i] = true;
            }
    }

    this.select = function(table, where) {
        if(!db[table]) return board.console.error('[DataBase:insert] Table "' + table + '" not found');
        if(!isObject(where))  where = {};

        for(var i in where)
            if(where.hasOwnProperty(i))
                if(!db[table].columns[i])
                    return board.console.error('[DataBase:insert] Column "' + i + '" not found');

        var results = [];

        for(var i = 0; i < db[table].entries.length; i++)
            for(var j in where)
                if(where.hasOwnProperty(j))
                    if(db[table].entries[i][db[table].column_orders.indexOf(j)] === where[j]) {
                        var r = db[table].entries[i];

                        for(var k = 0; k < r.length; k++) {
                            r[db[table].column_orders[k]] = r[k];
                        }

                        results.push(r);
                    }

        return results;
    };

    this.insert = function(table, entry) {
        if(!isArray(entry)) return board.console.error('[DataBase:insert] Invalid entry : must be an array');
        if(!db[table]) return board.console.error('[DataBase:insert] Table "' + table + '" not found');

        // TO DO : Consider filters

        for(var i = 0; i < entry.length; i++) {
            if (isDefined(entry[i]) && uniqueUsed[table][i])
                return board.console.error('[DataBase:insert] Column "' + db[table].column_orders[i] + '" is unique and is already used');

            if(!DataBase.checkValidData(entry[i], db[table].columns[db[table].column_orders[i]].type))
                return board.console.error('[DataBase:insert] In entry field ' + i + ' : Invalid data type, must be "' + db[table].columns[db[table].column_orders[i]].type + '"');
        }

        db[table].entries.push(entry);
        return true;
    };

    Object.freeze(this);

};

/**
 * Check if a JSON object is a valid database content
 * @param {object} content
 * @returns {boolean}
 */

DataBase.checkValidJSON = function(content) {
    for(var i in content)
        if(content.hasOwnProperty(i)) {
            if(!isString(i)) return board.console.error('Cannot create database : Table name must be a string');
            if(!isObject(content[i])) return board.console.error('Cannot create database : Table field must be an object');

            var uniqueUsed = {};

            for(var j in content[i])
                if(content[i].hasOwnProperty(j)) {
                    if(!i.match(/^([a-zA-Z0-9_]+)$/)) return board.console.error('Cannot create database : Invalid table name (must be not null and contains ONLY letters, numbers and _');
                    if(!isString(i)) return board.console.error('Cannot create database : Column name must be a string');

                    uniqueUsed[i] = {};

                    if(j.isOneOf('columns', 'column_orders', 'entries')) {
                        if(j === 'columns' && !isObject(content[i][j])) return board.console.error('Cannot create database : columns field must be a string');
                        if(j === 'entries' && !isArray(content[i][j])) return board.console.error('Cannot create database : entries field must be an array');
                        if(j === 'column_orders' && !isArray(content[i][j])) return board.console.error('Cannot create database : column_orders field must be an array')

                        for(var k in content[i][j])
                            if(content[i][j].hasOwnProperty(k)) {
                                if(j === 'columns') {
                                    // That's a column !
                                    if (!isString(k)) return board.console.error('Cannot create database : Column name must be a string in table "' + i + '"');
                                    if (!k.match(/^([a-zA-Z0-9_]+)$/)) return board.console.error('Cannot create database : Invalid column name (must be not null and contains ONLY letters, numbers and _) in table "' + i + '"');
                                    if(!isObject(content[i][j][k])) return board.console.error('Cannot create database : Column field must be an array in table "' + i + '"');

                                    for(var l in content[i][j][k])
                                        if(content[i][j][k].hasOwnProperty(l)) {
                                            if(!isString(l)) return board.console.error('Cannot create database : Column information name must be a string in column "' + k + '" in table "' + i + '"');
                                            if(!l.isOneOf('type', 'size', 'default', 'unique')) { board.console.warn('During creating database : In column "' + k + '" in table "' + i + '" : Information "' + l + '" is needless'); content[i][j][k][l] = null; delete content[i, j, k, l]; }

                                            if(l === 'type' && !content[i][j][k][l].isOneOf('integer', 'date', 'string', 'number')) return board.console.error('Cannot create database : Invalid column type "' + content[i][j][k][l] + '" in column "' + k +' " in table "' + i + '"');
                                            if(l === 'size' && !isNumber(content[i][j][k][l])) return board.console.error('Cannot create database : Invalid column size "' + content[i][j][k][l] + '" : Must be a string in column "' + k +' " in table "' + i + '"');
                                            if(l === 'default' && !DataBase.checkValidData(content[i][j][k][l], content[i][j][k].type)) return board.console.error('Cannot create database : Default column value does not match with column type in column "' + k + '" in table "' + i + '"');
                                            if(l === 'unique' && !isBoolean(content[i][j][k][l])) return board.console.error('Cannot create database : Invalid column information : unique must be a boolean (true of false) in column "' + k + '" in table "' + i + '"');

                                            // TO DO : Check filters !
                                        }
                                } else if(j === 'entries') {
                                    // That's an entry !
                                    for(var l = 0; l < content[i][j][k].length; l++) {
                                        if (isDefined(content[i][j][k]) && uniqueUsed[i][l])
                                            return board.console.error('[DataBase:insert] Column "' + content[i].column_orders[i] + '" is unique and is already used');

                                        if(!DataBase.checkValidData(content[i][j][k][l], content[i].columns[content[i].column_orders[l]].type))
                                            return board.console.error('[DataBase:insert] In entry field [' + l + '] in table "' + i + '" : Invalid data type, must be "' + content[i].columns[content[i].column_orders[l]].type + '"');
                                    }

                                } else if(j === 'column_orders') {
                                    if(!content[i].columns[content[i][j][k]]) return board.console.error('Cannot create database : Column "' + content[i][j][k] + '" not found in column_orders [' + k + ']');
                                }
                            }
                    } else {
                        board.console.warn('During creating database : During analysis table "' + i + '" : The field "' + j + '" is needless');
                    }

                }
        }

    return true;
};

DataBase.knownTypes = {
    string: function(s) { return isString(s); },
    number: function(n) { return isNumber(n); },
    integer: function(i) { return isInteger(i); },
    'safe-integer': function(s) { return isSafeInteger(s); },
    date: function(d) { return isNumber(d) && d.toString().length === 13; }
}

/**
 * Check if an entry is valid
 * @param {object} column_orders
 * @param {object} columns
 * @param {object} entry
 * @param debug
 */

DataBase.checkValidEntry = function(column_orders, columns, entry, debug) {
    function error(err) {
        return debug ? board.console.error(err) : false;
    }

    try {
        if(entry.length !== column_orders.length)
            return error('Entry fields number does not match with column_orders number (' + entry.length + ' ; ' + column_orders.length + ')');

        for(var i = 0; i < entry.length; i++) {
            var type = columns[column_orders[i]].type
            if(!DataBase.checkValidEntry(entry[i], type))
                return error('In entry field [' + i + '] : Invalid data type, found ' + DataBase.dataType(entry[i]) + ' instead of ' + type);
        }

        return true;
    }

    catch(e) { return false; };
};

/**
 * Check the validity of a data
 * @param {*} data
 * @param {string} type
 * @returns {boolean}
 */

DataBase.checkValidData = function(data, type) {
    return DataBase.knownTypes[type] && DataBase.knownTypes[type](data);
};

/**
 * Check the type of a data - This can take a little bit time !
 * @param {*} data
 * @returns {string}
 */

DataBase.getType = function(data) {
    for(var i in DataBase.knownTypes)
        if(DataBase.knownTypes.hasOwnProperty(i) && DataBase.knownTypes[i](data))
            return i;

    return 'unknown';
};

Object.freeze(DataBase);
