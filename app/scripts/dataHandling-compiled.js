'use strict';

let currentGame;

const playersList = $('#playersList');
const selectPlayerList = $('#selectPlayerList');
const newPlayerForm = $('#newPlayerForm');
const newPlayerNameInput = $('#newPlayerNameInput');

// TEMPLATES
// Use custom template delimiters.
_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;
const userListItemTemplate = _.template($('#userListItemTemplate').text());
const selectPlayerListItemTemplate = _.template($('#selectPlayerListItemTemplate').text());
const playerNotSetTemplate = _.template($('#playerNotSetTemplate').text());
const playerSetTemplate = _.template($('#playerSetTemplate').text());

// END TEMPLATES

const STARTING_SCORE = 1500;
const NORMALISATION = 400;
const K = 32;

function addPlayer(oldState, name) {

  const players = oldState.players;

  if (_.isUndefined(players[name])) {

    return {
      games: oldState.games,
      players: _.extend({}, players, {
        [name]: {
          name,
          score: STARTING_SCORE
        }
      })
    }

  } else {

    return oldState

  }

}

function reportGame(oldState, game) {

  const playersA = game.teamA.players.map(id => {
    return oldState.players[id]
  });
  const playersB = game.teamB.players.map(id => {
    return oldState.players[id]
  });

  const scoreA = game.teamA.score;
  const scoreB = game.teamB.score;

  const s = scoreA / ( scoreA + scoreB );
  /*(
   (game.teamA.score === game.teamB.score)
   ? 0.5
   : (
   (game.teamA.score > game.teamB.score)
   ? 1
   : 0
   )
   );*/

  const updated = updatedPlayers(playersA, playersB, s);

  const modification = {};
  updated.forEach(player => {
    modification[player.name] = player
  });

  return {
    games: _.concat(oldState.games, game),
    players: _.extend({}, oldState.players, modification)
  }

}

function updatedPlayers(playersA, playersB, s) {

  return _.concat(
    playersA.map(player => _.extend({}, player, {
      score: updatedScore(player, playersB, s)
    })),
    playersB.map(player => _.extend({}, player, {
      score: updatedScore(player, playersA, 1 - s)
    }))
  )

}

// score alg

function transformedRating(player) {
  const { score } = player;

  return Math.pow(10, score / NORMALISATION)
}

function expectedScore(playerA, playerB) {
  const tA = transformedRating(playerA);
  const tB = transformedRating(playerB);

  return tA / (tA + tB)
}

function updatedScore(player, opponents, s) {

  if (opponents.length === 0) {

    return player.score

  } else {

    const sum = opponents
      .map(opp => s - expectedScore(player, opp))
      .reduce((x, y) => x + y, 0);

    return player.score + (K / opponents.length ) * (sum / opponents.length);

  }

}

function leaderBoard(state) {
  return _.values(state.players).sort((p1, p2) => p2.score - p1.score)
}

// Storage

let state;

function getLocalState() {
//    const data = localStorage.getItem('state');
//
//    return (
//        _.isNull(data)
//            ? { players: {}, games: [] }
//            : JSON.parse(data)
//    )
  return (
    _.isUndefined(state)
      ? { players: {}, games: [] }
      : state
  )
}

function setLocalState(data) {
  state = data;
//    localStorage.setItem('state', JSON.stringify(
//        data
//    ));
}

function modifyState(redFn, arg) {
  setLocalState(
    redFn(
      getLocalState(),
      arg
    )
  );
}

function _reportGame(game) {
  modifyState(reportGame, game);
}

function _addPlayer(name) {
  modifyState(addPlayer, name);
}

function _getLeaderBoard() {
  return leaderBoard(getLocalState())
}

//
_addPlayer('Lenart');
_addPlayer('Jens');
_addPlayer('Gerrit');

_reportGame({
  teamA: {
    score: 10,
    players: ['Jens', 'Gerrit']
  },
  teamB: {
    score: 0,
    players: ['Lenart']
  }
});

const getPlayer = (playerName) => {
  return getLocalState().players[playerName];
};

const drawList = ({
  list, template, comparator, filter
}) => {
  list.html('');

  if(!filter) {
    filter = (player) => player;
  }

  const currentState = getLocalState();
  const players = currentState.players;

  const playersArray = [];
  _.each(players, (player) => {
    playersArray.push(player);
  });

  const sortedPlayers = playersArray.sort(comparator).filter(filter);

  _.each(sortedPlayers, (player, index) => {
    list.append(template(_.extend(player, {
      index
    })));
  });
};

const drawPlayersList = () => {
  drawList({
    list: playersList,
    template: userListItemTemplate,
    comparator: (playerA, playerB) => {
      return playerA.score > playerB.score ? -1 : 1;
    }
  });
};

const drawSelectPlayerList = () => {
  drawList({
    list: selectPlayerList,
    template: selectPlayerListItemTemplate,
    comparator: (playerA, playerB) => {
      return playerA.name > playerB.name ? 1 : -1;
    },
    filter: (player) => {
      return !currentGame.isAlreadyInGame(player.name);
    }
  });
};

const redrawPlayersLists = () => {
  drawPlayersList();
  drawSelectPlayerList();
};

class Game {
  constructor() {
    this.teamA = {
      score: 0,
      players: []
    };
    this.teamB = _.cloneDeep(this.teamA);
  }

  setPlayer({ team, index, player }) {
    this[team].players[index] = player;
  }

  isAlreadyInGame(player) {
    return this.teamA.players.indexOf(player) > -1 || this.teamB.players.indexOf(player) > -1;
  }

  getReport() {
    return _.pick(this, ['teamA', 'teamB']);
  }
}

const redrawGame = (game) => {
  [
    {
      team: 'A',
      index: 0
    },
    {
      team: 'A',
      index: 1
    },
    {
      team: 'B',
      index: 0
    },
    {
      team: 'B',
      index: 1
    }
  ].forEach(({ team, index }) => {
    const $el = $(`#team${team}Player${index}`);
    const playerName = _.get(game, `team${team}.players[${index}]`);

    if (playerName) {
      const player = getPlayer(playerName);
      $el.html(playerSetTemplate(player));
    } else {
      $el.html(playerNotSetTemplate());
    }
  });
};

const selectPlayerModal = $('#selectPlayerModal').modal();

const app = () => {
  newPlayerForm.on('submit', (e) => {
    e.preventDefault();
    const currentState = getLocalState();
    const players = currentState.players;

    const newPlayerName = newPlayerNameInput.val();

    if (!newPlayerName) {
      return alert('Missing player name!');
    }

    if (players[newPlayerName]) {
      return alert('Player name already taken!');
    }

    _addPlayer(newPlayerName);

    $('.ui.modal.add.player').modal('hide');
    newPlayerNameInput.val('');

    redrawPlayersLists();
  });

  currentGame = new Game();

  $('.addPlayerToTeam').on('click', function () {
    const $el = $(this);
    const team = $el.data('team');
    const index = $el.data('playerIndex');

    selectPlayerModal.player = {
      team,
      index
    };

    selectPlayerModal.modal('show');
  });

  selectPlayerList.on('click', '.playerSelect', function () {
    const $el = $(this);
    const player = $el.data('playerName');

    const playerData = _.extend(_.cloneDeep(selectPlayerModal.player), { player });

    currentGame.setPlayer(playerData);

    selectPlayerModal.player = {};
    selectPlayerModal.modal('hide');

    redrawGame(currentGame);
    drawSelectPlayerList();
  });

  redrawGame();
  redrawPlayersLists();
};

app();

// Playground
//
// _addPlayer('Lenart');
// _addPlayer('Jens');
// _addPlayer('Gerrit');
//
// _reportGame({
//   teamA: {
//     score: 10,
//     players: ['Jens', 'Gerrit']
//   },
//   teamB: {
//     score: 0,
//     players: ['Lenart']
//   }
// });

/*

 _reportGame({
 teamA: {
 score: 3,
 players: ['Jens']
 },
 teamB: {
 score: 10,
 players: ['Lenart']
 }
 });

 _addPlayer('Bogdan');

 _reportGame({
 teamA: {
 score: 0,
 players: ['Lenart']
 },
 teamB: {
 score: 10,
 players: ['Bogdan']
 }
 });

 _reportGame({
 teamA: {
 score: 0,
 players: ['Jens']
 },
 teamB: {
 score: 10,
 players: ['Bogdan']
 }
 });

 _reportGame({
 teamA: {
 score: 0,
 players: ['Gerrit']
 },
 teamB: {
 score: 10,
 players: ['Bogdan']
 }
 });

 */

// Output
//
// console.log(
//   JSON.stringify(_getLeaderBoard(), undefined, 2)
// );
