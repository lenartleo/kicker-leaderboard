'use strict';

const ENABLE_LOCAL_STORAGE = true;
const MEH = '¯\\_(ツ)_/¯';
const SLACK_TOKEN = 'SLACK_TOKEN_HERE';
const STARTING_SCORE = 1500;
const NORMALISATION = 400;
const K = 32;

// ELEMENTS
const playersList = $('#playersList');
const selectPlayerList = $('#selectPlayerList');
const newPlayerForm = $('#newPlayerForm');
const newPlayerNameInput = $('#newPlayerNameInput');
const selectPlayerModal = $('#selectPlayerModal').modal();
const startGameButton = $('#startGameButton');
const addPlayerModal = $('.ui.modal.add.player');
const addPlayerToTeam = $('.addPlayerToTeam');
const finishGameButton = $('#finishGameButton');
const $teamAScoreInput = $('#teamAScoreInput');
const $teamBScoreInput = $('#teamBScoreInput');
const $rematchButton = $('#rematchButton');
const $endGameButton = $('#endGameButton');

// TEMPLATES
// Use custom template delimiters.
_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;
const userListItemTemplate = _.template($('#userListItemTemplate').text());
const selectPlayerListItemTemplate = _.template($('#selectPlayerListItemTemplate').text());
const playerNotSetTemplate = _.template($('#playerNotSetTemplate').text());
const playerSetTemplate = _.template($('#playerSetTemplate').text());

// END TEMPLATES
function addPlayer(oldState, player) {

  const players = oldState.players;

  if (_.isUndefined(players[player.name])) {
    player.score = STARTING_SCORE;

    return {
      games: oldState.games,
      players: _.extend(_.cloneDeep(players), {
        [player.name]: player
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
  if (ENABLE_LOCAL_STORAGE) {
    const data = localStorage.getItem('state');

    return (
      _.isNull(data)
        ? { players: {}, games: [] }
        : JSON.parse(data)
    )
  }

  return (
    _.isUndefined(state)
      ? { players: {}, games: [] }
      : state
  )
}

function setLocalState(data) {
  state = data;
  if (ENABLE_LOCAL_STORAGE) {
    localStorage.setItem('state', JSON.stringify(
      data
    ));
  }
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

function _addPlayer(player) {
  modifyState(addPlayer, player);
}

function _getLeaderBoard() {
  return leaderBoard(getLocalState())
}

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
class Game {
  constructor(initialState = {}) {
    this.state = _.defaultsDeep(initialState, {
      teamA: {
        score: 0,
        players: []
      },
      teamB: {
        score: 0,
        players: []
      }
    });

    this.inProgress = false;
  }

  setPlayer({ team, index, player }) {
    this.state[team].players[index] = player;
  }

  isAlreadyInGame(player) {
    return this.state.teamA.players.indexOf(player) > -1 || this.state.teamB.players.indexOf(player) > -1;
  }

  getReport() {
    return _.pick(this.state, ['teamA', 'teamB']);
  }

  setFinalScore(teamAScore, teamBScore) {
    this.state.teamA.score = teamAScore;
    this.state.teamB.score = teamBScore;
  }

  start() {
    if (this.state.teamA.players.length < 1 || this.state.teamB.players.length < 1) {
      throw new Error('Not enough players');
    }

    this.inProgress = true;
  }
}

class Slack {
  constructor() {
    this.users = [];
  }

  init() {
    return this.retrieveUsersList()
      .done((users) => {
        this.users = users.members;
      });
  }

  findUserByName(name) {
    return _.find(this.users, (user) => {
      return user.name === name;
    });
  }

  retrieveUsersList() {
    return $.get(`https://slack.com/api/users.list?token=${SLACK_TOKEN}`);
  }
}

const getPlayer = (playerName) => {
  return getLocalState().players[playerName];
};

const drawList = ({
  list, template, comparator, filter
}) => {
  list.html('');

  if (!filter) {
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

const drawSelectPlayerList = (currentGame) => {
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

const redrawPlayersLists = (currentGame) => {
  drawPlayersList();
  drawSelectPlayerList(currentGame);
};

const redrawGame = (currentGame) => {
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
    const playerName = _.get(currentGame, `state.team${team}.players[${index}]`);

    if (playerName) {
      const player = getPlayer(playerName);
      $el.html(playerSetTemplate(player));
    } else {
      $el.html(playerNotSetTemplate());
    }
  });

  if (currentGame.inProgress) {
    $('#gameInProgress').show();
    $('#newGame').hide();
  } else {
    $('#gameInProgress').hide();
    $('#newGame').show();
  }
};

const app = () => {
  const slack = new Slack();
  let currentGame = new Game();

  slack.init()
    .done(() => {
      redrawGame(currentGame);
      redrawPlayersLists(currentGame);
    })
    .fail((e) => {
      console.error(e);
      alert('Whoops... Slack failed to provide us with users!');
    });

  // methods
  const startNewGame = () => {
    try {
      currentGame.start();

      redrawGame(currentGame);
    } catch (e) {
      alert(e);
    }
  };

  const resetGame = (initialGameState = {}) => {
    currentGame = new Game(initialGameState);

    $teamAScoreInput.val(_.get(initialGameState, 'teamA.score', 0));
    $teamBScoreInput.val(_.get(initialGameState, 'teamB.score', 0));

    redrawGame(currentGame);
    redrawPlayersLists(currentGame);
  };

  const finishGame = (passedParams) => {
    const params = _.defaults(passedParams || {}, {
      rematch: false
    });

    const teamAScore = Number($teamAScoreInput.val());
    const teamBScore = Number($teamBScoreInput.val());

    if (teamAScore + teamBScore < 1) {
      throw new Error('Invalid end score');
    }

    currentGame.setFinalScore(teamAScore, teamBScore);

    const report = _.cloneDeep(currentGame.getReport());

    _reportGame(report);

    if (params.rematch) {
      let initialGameState = _.cloneDeep(report);
      initialGameState.teamA.score = 0;
      initialGameState.teamB.score = 0;

      resetGame(initialGameState);
      startNewGame();
    } else {
      resetGame();
    }
  };

  const rematchGame = () => {
    try {
      finishGame({ rematch: true });
    } catch (e) {
      alert(e);
    }
  };

  // Listeners
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

    const slackUser = slack.findUserByName(newPlayerName);

    if (!slackUser) {
      return alert(`Player name must be a valid slack username!\n${MEH}`);
    }

    _addPlayer(slackUser);

    addPlayerModal.modal('hide');
    newPlayerNameInput.val('');

    redrawPlayersLists(currentGame);
  });

  addPlayerToTeam.on('click', function () {
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
    drawSelectPlayerList(currentGame);
  });

  startGameButton.on('click', startNewGame);

  finishGameButton.on('click', () => {
    try {
      finishGame();
      resetGame();
    } catch (e) {
      alert(e);
    }
  });

  $rematchButton.on('click', rematchGame);

  $endGameButton.on('click', resetGame);
};

app();
