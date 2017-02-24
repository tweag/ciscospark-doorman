// Copy-pasted from Botkit. Ideally, Botkit would expose this so you can use it for testing.
export default () => {
  const botkit = {
    memory_store: {
      users: {},
      channels: {},
      teams: {},
    },
    log: () => null
  }

  return {
    teams: {
      get: function(team_id, cb) {
        cb(null, botkit.memory_store.teams[team_id]);
      },
      save: function(team, cb) {
        botkit.log('Warning: using temporary storage. Data will be lost when process restarts.');
        if (team.id) {
          botkit.memory_store.teams[team.id] = team;
          cb(null, team.id);
        } else {
          cb('No ID specified');
        }
      },
      all: function(cb) {
        cb(null, botkit.memory_store.teams);
      }
    },
    users: {
      get: function(user_id, cb) {
        cb(null, botkit.memory_store.users[user_id]);
      },
      save: function(user, cb) {
        botkit.log('Warning: using temporary storage. Data will be lost when process restarts.');
        if (user.id) {
          botkit.memory_store.users[user.id] = user;
          cb(null, user.id);
        } else {
          cb('No ID specified');
        }
      },
      all: function(cb) {
        cb(null, botkit.memory_store.users);
      }
    },
    channels: {
      get: function(channel_id, cb) {
        cb(null, botkit.memory_store.channels[channel_id]);
      },
      save: function(channel, cb) {
        botkit.log('Warning: using temporary storage. Data will be lost when process restarts.');
        if (channel.id) {
          botkit.memory_store.channels[channel.id] = channel;
          cb(null, channel.id);
        } else {
          cb('No ID specified');
        }
      },
      all: function(cb) {
        cb(null, botkit.memory_store.channels);
      }
    }
  }
}
