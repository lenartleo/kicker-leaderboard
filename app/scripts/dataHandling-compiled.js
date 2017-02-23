'use strict';

//const _ = require('lodash');

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var STARTING_SCORE = 0;
var NORMALISATION = 400;
var K = 32;

function addPlayer(oldState, name) {

    var players = oldState.players;

    if (_.isUndefined(players[name])) {

        return {
            games: oldState.games,
            players: _.extend({}, players, _defineProperty({}, name, {
                name: name,
                score: STARTING_SCORE
            }))
        };
    } else {

        return oldState;
    }
}

function reportGame(oldState, game) {

    var playersA = game.teamA.players.map(function (id) {
        return oldState.players[id];
    });
    var playersB = game.teamB.players.map(function (id) {
        return oldState.players[id];
    });

    var scoreA = game.teamA.score;
    var scoreB = game.teamB.score;

    var s = scoreA / (scoreA + scoreB); /*(
                                        (game.teamA.score === game.teamB.score)
                                        ? 0.5
                                        : (
                                        (game.teamA.score > game.teamB.score)
                                        ? 1
                                        : 0
                                        )
                                        );*/

    var updated = updatedPlayers(playersA, playersB, s);

    var modification = {};
    updated.forEach(function (player) {
        modification[player.name] = player;
    });

    return {
        games: _.concat(oldState.games, game),
        players: _.extend({}, oldState.players, modification)
    };
}

function updatedPlayers(playersA, playersB, s) {

    return _.concat(playersA.map(function (player) {
        return _.extend({}, player, {
            score: updatedScore(player, playersB, s)
        });
    }), playersB.map(function (player) {
        return _.extend({}, player, {
            score: updatedScore(player, playersA, 1 - s)
        });
    }));
}

// score alg

function transformedRating(player) {
    var score = player.score;


    return Math.pow(10, score / NORMALISATION);
}

function expectedScore(playerA, playerB) {
    var tA = transformedRating(playerA);
    var tB = transformedRating(playerB);

    return tA / (tA + tB);
}

function updatedScore(player, opponents, s) {

    if (opponents.length === 0) {

        return player.score;
    } else {

        var sum = opponents.map(function (opp) {
            return s - expectedScore(player, opp);
        }).reduce(function (x, y) {
            return x + y;
        }, 0);

        return player.score + K * (sum / opponents.length);
    }
}

function leaderBoard(state) {
    return _.values(state.players).sort(function (p1, p2) {
        return p2.score - p1.score;
    });
}

// Storage

function getLocalState() {
    var data = localStorage.getItem('state');

    return _.isNull(data) ? { players: {}, games: [] } : JSON.parse(data);
}

function setLocalState(data) {
    localStorage.setItem('state', JSON.stringify(data));
}

function modifyState(redFn, arg) {
    setLocalState(redFn(getLocalState(), arg));
}

function _saveGame(game) {
    modifyState(reportGame, game);
}

function _createPlayer(name) {
    modifyState(addPlayer(), name);
}

function _getLeaderBoard() {
    return leaderBoard(getLocalState());
}

// Playground

/*

let state = {
    games: [],
    players: {}
};

state = addPlayer(state, 'Gerrit');
state = addPlayer(state, 'Jens');
state = addPlayer(state, 'Lennart');
state = addPlayer(state, 'Bogdan');
state = addPlayer(state, 'Alex');

const games = [{
    teamA: {
        score: 0,
        players: ['Gerrit']
    },
    teamB: {
        score: 10,
        players: ['Jens']
    }
},{
    teamA: {
        score: 10,
        players: ['Gerrit']
    },
    teamB: {
        score: 0,
        players: ['Jens']
    }
},{
    teamA: {
        score: 5,
        players: ['Gerrit']
    },
    teamB: {
        score: 10,
        players: ['Jens']
    }
},{
    teamA: {
        score: 6,
        players: ['Gerrit']
    },
    teamB: {
        score: 10,
        players: ['Jens']
    }
},{
    teamA: {
        score: 2,
        players: ['Bogdan']
    },
    teamB: {
        score: 2,
        players: ['Jens']
    }
},{
    teamA: {
        score: 10,
        players: ['Bogdan', 'Gerrit']
    },
    teamB: {
        score: 0,
        players: ['Jens', 'Alex']
    }
}];

state = games.reduce( reportGame, state );

console.log(
    JSON.stringify( state, undefined, 2 )
);

console.log(
    JSON.stringify( leaderBoard(state), undefined, 2 )
);

console.log(
    JSON.stringify(
        reportGame( state, games[0] ),
        undefined, 2
    )
);

*/

module.exports = {
    _saveGame: _saveGame,
    _createPlayer: _createPlayer,
    _getLeaderBoard: _getLeaderBoard
};

//# sourceMappingURL=dataHandling-compiled.js.map