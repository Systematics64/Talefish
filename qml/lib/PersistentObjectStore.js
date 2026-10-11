.pragma library

var locstorage;
var db;
var settings = ['SettingsDB','1.0','Settings'];
function getDatabase() {
    if(!locstorage) {
        return;
    }

    if(!db) db = locstorage.openDatabaseSync(settings[0],settings[1],settings[2], 5000);
    return db;
}

function initialize(sttngs, ls) {
    if(sttngs && sttngs.length) {
        settings = sttngs;
    }
    if(ls){
        locstorage = ls;
    }
    var db = getDatabase();
    db.transaction(
                function(tx) {
                    // Create the settings table if it doesn't already exist
                    // If the table exists, this is skipped
                    tx.executeSql('CREATE TABLE IF NOT EXISTS settings(settingsName TEXT, keyName TEXT, value TEXT)');
                    tx.executeSql('CREATE INDEX IF NOT EXISTS settingsName ON settings (settingsName);');
                    tx.executeSql('CREATE UNIQUE INDEX IF NOT EXISTS fullKeyName ON settings (settingsName, keyName);');
                }
                );
//    console.log('DB initialized', settings[3]);
}
function reset() {
    db.transaction(
                function(tx) {
                    // Create the settings table if it doesn't already exist
                    // If the table exists, this is skipped
                    tx.executeSql('DROP TABLE IF EXISTS settings');
                }
                );
}

// Only data properties belong in the database. QML objects such as Connections
// are runtime infrastructure and may also be read-only when loading them back.
function isPersistentProperty(obj, key) {
    var skippedAttributes = ['objectName', 'doPersist', 'storeSettings'];
    return skippedAttributes.indexOf(key) === -1
            && key.charAt(0) !== '_'
            && key.lastIndexOf('on', 0) !== 0
            && typeof obj[key] !== 'function'
            && !Qt.isQtObject(obj[key]);
}

function save(obj, keys) {
    db.transaction(function (tx) {
                    // Save all fields
                    var haskeys = !!keys;
                    if(!haskeys) {
                        // Clean all fields of this settings object first, so the DB is always clean from unused fields
                        //tx.executeSql('DELETE FROM settings WHERE settingsName=?;', [obj.objectName]);
                        keys = Object.keys(obj);
                    }
                    for(var i = 0; i < keys.length; i +=1) {
                        if(!isPersistentProperty(obj, keys[i])) {
                            continue;
                        }
                        var value = JSON.stringify(obj[keys[i]]);

                        if (typeof value !== 'undefined') {
                            tx.executeSql('REPLACE INTO settings (settingsName, keyName, value) VALUES (?, ?, ?);', [obj.objectName, keys[i], value]);
                        } else if(haskeys) {
                            tx.executeSql('DELETE FROM settings WHERE settingsName=? AND keyName=?;', [obj.objectName, keys[i]]);
                        }
                    }
                });
}

function saveKey(obj, key) { // convenience method to save just one data property
    if(!isPersistentProperty(obj, key)) {
        return;
    }
    db.transaction(function (tx) {
                    tx.executeSql('REPLACE INTO settings (settingsName, keyName, value) VALUES (?, ?, ?);', [obj.objectName, key, JSON.stringify(obj[key])]);
                });
}

function load(obj) {
    db.transaction(
                function (tx) {

                    // Load fields
                    for (var fieldName in obj) {
                        // Also ignore runtime fields left by earlier versions.
                        if (isPersistentProperty(obj, fieldName)) {

                            var rs = tx.executeSql('SELECT value FROM settings WHERE settingsName=? AND keyName=?;', [obj.objectName, fieldName]);

                            if (rs.rows.length > 0) {
                                obj[fieldName] = JSON.parse(rs.rows.item(0).value);
                                //                        console.log("Loaded: " + obj.objectName + "." + fieldName + ". New value: " + JSON.stringify(obj[fieldName]));
                            }// else { console.log("Not loaded: " + obj.objectName + "." + fieldName + ". Current value:" + obj[fieldName] + "("+typeof obj[fieldName]+")"); }

                        }
                    }
                    obj._loaded = true
                }
                );
}
