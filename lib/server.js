var connections = {};

var expire = function(id) {
    Presences.remove(id);
    delete connections[id];
};

var unset = function(id) {
    console.log("inactive", id);
    Presences.update(id, {
        $set: {
            inactive: true
        }
    });
    connections[id].idle = true;
};

var set = function(id) {
    console.log("reactive", id);
    Presences.update(id, {
        $unset: {
            inactive: 1
        }
    });
    connections[id] = {};
    tick(id);
};

var tick = function(id) {
    connections[id].lastSeen = Date.now();
};


Meteor.onConnection(function(connection) {
    console.log('connectionId: ' + connection.id + ' userId: ' + this.userId);
    Presences.upsert(connection.id, {
        $set: {
            inactive: false
        }
    });
    connections[connection.id] = {};
    tick(connection.id);

    connection.onClose(function() {
        console.log('connection closed: ' + connection.id);
        expire(connection.id);
    });
});

Meteor.methods({
    presenceTick: function() {
        check(arguments, [Match.Any]);
        if (this.connection && connections[this.connection.id])
            tick(this.connection.id);
        else {
            console.log("presenceTick from unknown connection", this.connection && this.connection.id);
        }
    }
});

Meteor.setInterval(function() {
    _.each(connections, function(connection, id) {
        if (!connection.idle && connection.lastSeen < (Date.now() - 45000))
            unset(id);
        if (!!connection.idle && connection.lastSeen >= (Date.now() - 45000))
            set(id);
    });

}, 5000);
