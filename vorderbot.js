const { RtmClient, CLIENT_EVENTS, RTM_EVENTS } = require('@slack/client');

// An access token (from your Slack app or custom integration - usually xoxb)
const token = process.env.SLACK_TOKEN;

// Cache of data
const appData = {};

// Initialize the RTM client with the recommended settings. Using the defaults for these
// settings is deprecated.
const rtm = new RtmClient(token, {
  dataStore: false,
  useRtmConnect: true,
});

const vowel_freqs = {'A': 15, 'E': 21, 'I': 13, 'O': 13, 'U': 5};
const consonant_freqs = {
        'B': 2,
        'C': 3,
        'D': 6,
        'F': 2,
        'G': 3,
        'H': 2,
        'J': 1,
        'K': 1,
        'L': 5,
        'M': 4,
        'N': 8,
        'P': 4,
        'Q': 1,
        'R': 9,
        'S': 9,
        'T': 9,
        'V': 1,
        'W': 1,
        'X': 1,
        'Y': 1,
        'Z': 1 
};

function sample(arr, num) {
  var ret = [];
  var larr = arr;
  var ans_as_string = false;
  if (typeof larr == "string") {
    larr = larr.split('');
    ans_as_string = true;
  } else {
    larr = Array.from(larr);
  }
  while (num > 0) {
    var rand = Math.floor(Math.random()*larr.length);
    ret.push(larr[rand]);
    larr.splice(rand, 1);
    num -= 1;
  }
  if (ans_as_string) {
     return ret.join('');
  }
  return ret;
}

function contains(haystack, needle) {
    if (needle.length == 0) return true;
    if (needle.length > haystack.length) return false;
    var j = 0;
    for (var i in haystack) {
        if (j >= needle.length) return true;
        if (haystack[i] < needle[j]) continue;
        if (haystack[i] > needle[j]) return false;
        j+=1;
    }
    if (j >= needle.length) return true;
    return false;
}

const Dictionary = function(filename) {
    var dict_lines = require('readline').createInterface({
        input: require('fs').createReadStream(filename)
    });

    this.dictionary = {};
    this.ready = false;
    dict_lines.on('line', (line) => {
        var s = line.toLowerCase().split('');
        s.sort();
        this.dictionary[line] = s;
    }).on('close', () => {
        console.log("Dictionary has " + Object.getOwnPropertyNames(this.dictionary).length + " words.");
        this.ready = true;
    });
}

Dictionary.prototype.wordsContaining = function(letters) {
    if (!this.ready) return null;
    var sl = letters.toLowerCase().split('');
    sl.sort();

    var words = {};
    for (var word in this.dictionary) {
	var s = this.dictionary[word];
	if (contains(sl, s)) {
	    if (!(word.length in words)) {
		words[word.length] = [];
	    }
            words[word.length].push(word);
	}
    }
    var ret = [];
    var lens = Object.getOwnPropertyNames(words);
    lens.sort();
    lens.reverse();
    lens.forEach(l => {
        words[l].forEach(w => {ret.push(w);});
    });
    return ret;
}

Dictionary.prototype.wordsWithNLetters = function(word_len) {
    if (!this.ready) return null;
    var words = [];
    for (var word in this.dictionary) {
	if (word.length == word_len) {
	    words.push(word);
	}
    }
    return words;
}

Dictionary.prototype.contains = function(word) {
  return (word.toLowerCase() in this.dictionary);
}

const dictionary = new Dictionary("sowpods.txt");

const commands = {
  'numbers': {
    fn: (u, c, args, ts) => { do_numbers(c, args); },
    help: 'Start a numbers game. If "numbers &lt;n&gt;" is used, start a game using _n_ large numbers. _n_ must be between 0 and 4 inclusive.'
  },
  'words': {
    fn: (u, c, args, ts) => { do_words(c, args); },
    help: 'Start a letters game. If "words &lt;n&gt;" is used, start a game using _n_ vowels. _n_ must be between 3 and 5 inclusive.'
  },
  'conundrum': {
    fn: (u, c, args, ts) => { do_conundrum(c); },
    help: 'Start a conundrum.'
  },
  'list': {
    fn: (u, c, args, ts) => { do_last_words_list(c,args); },
    help: 'List the full set of valid words for the last words game or if "list &lt;n&gt;" is used, only list words of length _n_.'
  },
  'help': {
    fn: (u, c, args, ts) => { do_help(c); },
    help: 'Show this help.'
  }
};

function Rec(lvl, target, chosen, exp) {
  var sol = null;
  var l = 7;
  for (var i in chosen) {
    for (var j in chosen) {
      if (i != j && chosen[j] != 0 && chosen[i] >= chosen[j]) {
	for (var op=0; op < 4; op++) {
	  var wd = false;
	  if (op < 2) {
	    wd = true;
	  } else if (op == 2) {
	    if (chosen[j] != 1) {
	      wd = true;
	    }
	  } else {
	    if (chosen[j] != 1 && chosen[i] % chosen[j] == 0) {
	      wd = true;
	    }
	  }
	  if (wd) {
	    var sti = chosen[i];
	    var stj = chosen[j];
	    switch (op) {
	    case 0:
		chosen[i] = sti + stj;
		exp.push({"n1": sti, "op": "+", "n2": stj, "ans": sti + stj});
		break;
	    case 1:
		chosen[i] = sti - stj;
		exp.push({"n1": sti, "op": "-", "n2": stj, "ans": sti - stj});
		break;
	    case 2:
		chosen[i] = sti * stj;
		exp.push({"n1": sti, "op": "*", "n2": stj, "ans": sti * stj});
		break;
	    case 3:
		chosen[i] = sti / stj;
		exp.push({"n1": sti, "op": "/", "n2": stj, "ans": sti / stj});
		break;
	    default:
		break;
	    }
	    chosen[j] = 0;
	    if (chosen[i] == target) {
	      if (sol === null || sol.length > exp.length) {
		sol = exp.slice();
	      }
	    } else {
	      if (lvl < 5) {
		var s = Rec(lvl+1, target, chosen, exp.slice());
		if (s !== null) {
		  if (sol === null || sol.length > s.length) {
		    sol = s.slice();
		  }
		}
	      }
	    }
	    chosen[i] = sti;
	    chosen[j] = stj;
	    exp.pop();
	  }
	}
      }
    }
  }
  return sol;
}

function shortest_numbers_solution(numbers, total) {
  var chosen = numbers.slice();
  var sol = Rec(1, total, chosen, []);
  if (sol !== null) {
    var ret = [];
    sol.forEach(v => ret.push(v["n1"].toString() + " " + v["op"] + " " + v["n2"].toString() + " = " + v["ans"]));
    return ret;
  }
  return null;
}

var equ_chars_re = new RegExp('^[-0-9+/*() ]+$');

function is_nick(msg_nick, nick) {
  return msg_nick == ("<@" + nick + ">");
}

function do_help(channel) {
  var cmds = Object.getOwnPropertyNames(commands);
  cmds.sort();

  var message = "*VorderBot help*\n==============";

  var max_cmd_len = 0;
  cmds.forEach((cmd) => {
    if (cmd.length > max_cmd_len) max_cmd_len = cmd.length;
  });
  cmds.forEach((cmd) => {
    var show_cmd = (cmd + (" ".repeat(max_cmd_len-1))).substr(0,max_cmd_len);
    message += ("\n" + show_cmd + " - " + commands[cmd].help);
  });
  rtm.sendMessage(message, channel);
}

var spawn = require("child_process").spawn;

function do_equation(user, channel, possible_answer, ts) {
  var num_game_ids = Object.getOwnPropertyNames(appData.numsGames);
  if (num_game_ids.length < 1) return false;
  var possible_games = num_game_ids.map(id => appData.numsGames[id]).filter(game => game.channel == channel);
  if (possible_games.length < 1) return false;

  var proc = spawn("./equ.py", [possible_answer]);
  proc.stdout.setEncoding("utf-8");
  proc.stdout.on("data", data => {
    var vals = data.split(" ").map(x => parseInt(x));
    if (vals[0]>99 && vals[0]<1000) {
      possible_games.forEach(function(g) {
	var used_numbers = vals.slice(1);
	used_numbers.sort((a,b) => a-b);
	if (contains(g["numbers"], used_numbers)) {
	  var diff = Math.abs(g["target"] - vals[0]);
	  if (diff <= 10) {
	    if (diff < g["closest_guess_away"]) {
	      g["closest_guess"] = vals[0];
	      g["closest_guess_away"] = diff;
	    }
	    if (!(user in g["guesses"]) || g["guesses"][user]["away"] > diff) {
	      g["guesses"][user] = {"away": diff, "total": vals[0], "solution": possible_answer, ts: ts};
	    }
	  }
	}
      });
    }
  });
  proc.stdout.on("close", code => {
    for (var i in appData.calculating) {
      if (appData.calculating[i].proc === proc) {
	appData.calculating.splice(i,1);
	break;
      }
    }
  });
  appData.calculating.push({"proc": proc, "possible_games": possible_games});

  return true;
}

function arrays_equal(a, b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}

function is_round_answer(user, channel, possible_answer, ts) {
  const is_alpha = new RegExp("^[a-zA-Z]*$");
  var ret = false;

  if (possible_answer.search(is_alpha) == 0) {
    var lpa = possible_answer.toLowerCase();
    var lpa_sorted = lpa.split('');
    lpa_sorted.sort();
    if (lpa.length == 9) {
      for (var gid in appData.conundrumGames) {
	var g = appData.conundrumGames[gid];
	if (g["channel"] != channel) continue;
	var game_word = g["word"].toLowerCase();
	var game_letters_sorted = game_word.split('');
	game_letters_sorted.sort();
	if (arrays_equal(lpa_sorted,game_letters_sorted)) {
	  if (g["word"].toLowerCase() == lpa) {
	    g["winner"] = {'user': user, 'ts': ts};
	    end_conundrum(gid);
	  } else {
	    if (dictionary.contains(lpa)) {
	      rtm.sendMessage(`Good guess <@${user}>, but not the 9 letter word I'm looking for!`, g.channel);
	    } else {
	      rtm.sendMessage(`The word ${possible_answer} is not in my dictionary!`, g.channel);
	    }
	  }
	}
      }
    }
    for (var gid in appData.wordGames) {
      var g = appData.wordGames[gid];
      if (g["channel"] != channel) continue;
      var game_letters_sorted = g["letters"].toLowerCase().split('');
      game_letters_sorted.sort();
      if (contains(game_letters_sorted, lpa_sorted)) {
        if (g["words"].indexOf(lpa)>=0) {
	  if (!(user in g["guesses"]) ||
	      lpa.length > g["guesses"][user].word.length) {
	    g["guesses"][user] = {word: possible_answer, ts: ts};
	    if (g["longest_guess"] < possible_answer.length) {
	      g["longest_guess"] = possible_answer.length
	    }
	  }
	} else {
	  if (g["bad_guesses"].indexOf(lpa)<0) {
	    g["bad_guesses"].push(lpa);
	  }
	}
	ret = true;
      }
    }
    return ret;
  }
  if (possible_answer.match(equ_chars_re)) {
    ret = do_equation(user, channel, possible_answer, ts);
  }

  return ret;
}

function end_game(game_id) {
  if (!(game_id in appData.wordGames)) return false;
  var game = appData.wordGames[game_id];
  delete appData.wordGames[game_id];
  appData.lastWords[game.channel] = game.words;
  var score = game.longest_guess;
  var react = 'thumbsup';
  if (game.longest_guess == game.longest_words[0].length) react = 'party';
  if (score == 9) {
    score = 18;
    react = 'party-parrot';
  }
  if (score == 0) {
    rtm.sendMessage("Nobody found any words, try again!", game.channel);
  } else {
    var winners = {};
    for (var user in game.guesses) {
      var w = game.guesses[user];
      if (w.word.length == game.longest_guess) {
	rtm.sendMessage(`<@${user}> gets ${score} points for ${w.word}`, game.channel);
	rtm._makeAPICall('reactions.add', {name: react}, {channel: game.channel, timestamp: w.ts});
      }
    }
  }
  game.bad_guesses.forEach(w => {
    rtm.sendMessage(`The word ${w} is not in my dictionary.`, game.channel);
  });
  if (game.longest_words.length > 1) {
    var l = game.longest_words[0].length;
    rtm.sendMessage(`The longest words were ${l} letters long: ` + game.longest_words.join(", "), game.channel);
  } else {
    var w = game.longest_words[0];
    rtm.sendMessage(`The longest word was ${w.length} letters long: ${w}`, game.channel);
  }
  return true;
}

function end_conundrum(game_id) {
  if (!(game_id in appData.conundrumGames)) return false;
  var game = appData.conundrumGames[game_id];
  delete appData.conundrumGames[game_id];
  if (game["winner"] === null) {
    rtm.sendMessage("Nobody found the conundrum!", game.channel);
    rtm.sendMessage(`The word I was looking for is: ${game["word"]}`, game.channel);
  } else {
    var user = game["winner"]['user'];
    var ts = game["winner"]['ts'];
    rtm.sendMessage(`Congratulations <@${user}> the answer I was looking for was ${game["word"]}, you score 10 points!`, game.channel);
    rtm._makeAPICall('reactions.add', {name: 'party-parrot'}, {channel: game.channel, timestamp: ts});
  }
}

function end_nums_game(game_id) {
  if (!(game_id in appData.numsGames) && !(game_id in appData.numsFinishedGames)) return false;
  if (game_id in appData.numsGames) {
    appData.numsFinishedGames[game_id] = appData.numsGames[game_id];
    delete appData.numsGames[game_id];
  }
  var game = appData.numsFinishedGames[game_id];
  for (var c = 0; c < appData.calculating.length; c++) {
    var calc = appData.calculating[c];
    if (game in calc.possible_games) {
      setTimeout(function() {
	end_nums_game(game_id);
      }, 1000);
      return false;
    }
  }
  delete appData.numsFinishedGames[game_id];
  var channel = game["channel"];
  var closest_guess_away = game["closest_guess_away"];
  var score = [10,7,7,7,7,7,5,5,5,5,5,0][closest_guess_away];
  var react = 'thumbsup';
  if (closest_guess_away == 0) react = 'party';
  if (closest_guess_away == 11) {
    rtm.sendMessage("Nobody found a close enough solution, try again!", channel);
  } else {
    var winners = Object.getOwnPropertyNames(game["guesses"]).filter(k => {
      return game["guesses"][k]["away"] == closest_guess_away;
    });
    winners.forEach(user => {
      var sol = game["guesses"][user];
      rtm.sendMessage(`<@${user}> gets ${score} points for getting to ${sol["total"]} (${closest_guess_away} away)`, channel);
      rtm._makeAPICall('reactions.add', {name: react}, {channel: channel, timestamp: sol["ts"]});
    });
  }
  if (game["shortest_solution"] === undefined || game["shortest_solution"] === null) {
    rtm.sendMessage(`The target, ${game["target"]}, could not be achieved`, channel);
  } else {
    var message = `The shortest solution for ${game["target"]} is:\n`;
    message += game["shortest_solution"].join("\n");
    rtm.sendMessage(message, channel);
  }
}

function do_numbers(channel, args) {
  var t = Math.floor(Math.random()*5); // [0,4]
  if (args.length > 0 && args[0].length > 0) {
    var val = parseInt(args[0]);
    if (!isNaN(val) && val >= 0 && val <= 4) {
      t = val;
    } else {
      rtm.sendMessage(`I did not understand "${args[0]}" as a number of large numbers between 0 and 4, continuing with a random number of large numbers.`, channel);
    }
  }
  var n = sample([25,50,75,100], t);
  var elsewhere = 6 - t;
  n = n.concat(sample([1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10], elsewhere));
  var total = 101 + Math.floor(Math.random()*899);
  var game_id = Math.floor(Math.random()*1000000);
  while (game_id in appData.numsGames) {
    game_id = Math.floor(Math.random()*1000000);
  }
  var ns = n.slice();
  ns.sort((a,b) => a-b);
  appData.numsGames[game_id] = {"channel": channel, "numbers": ns, "target": total, "guesses": {}, "closest_guess_away": 11, "closest_guess": 0, "shortest_solution": undefined};
  rtm.sendMessage(n.join(' ') + " and your total is " + total.toString() + "  you have 30 seconds.....", channel);
  setTimeout(function() {
    end_nums_game(game_id);
  }, 30000);
  appData.numsGames[game_id].shortest_solution = shortest_numbers_solution(n, total);
}

function do_words(channel, args) {
  var num_vowels = 3+Math.floor(Math.random()*3); // [3,5]
  if (args.length > 0 && args[0].length > 0) {
    var val = parseInt(args[0]);
    if (!isNaN(val) && val >= 3 && val <= 5) {
      num_vowels = val;
    } else {
      rtm.sendMessage(`I did not understand "${args[0]}" as a number of vowels between 3 and 5, continuing with a random number.`, channel);
    }
  }
  var num_consonants = 9 - num_vowels;
  var vowels = "";
  for (var v in vowel_freqs) {
    vowels += v.repeat(vowel_freqs[v]);
  }
  var consonants = "";
  for (var c in consonant_freqs) {
    consonants += c.repeat(consonant_freqs[c]);
  }
  var letters = sample(vowels, num_vowels) + sample(consonants, num_consonants);
  letters = sample(letters, 9);
  var found_words = dictionary.wordsContaining(letters);
  if (found_words === null) {
    rtm.sendMessage("VorderBot is not ready yet, please try again later", channel);
    return null;
  }
  if (found_words.length == 0) {
    rtm.sendMessage(`VorderBot found no words for the letters ${letters}`, channel);
    return null;
  }
  var longest_word_len = found_words[0].length;
  var longest_words = found_words.filter(word => (word.length == longest_word_len));
  var game_id = Math.floor(Math.random()*1000000);
  while (game_id in appData.wordGames) {
    game_id = Math.floor(Math.random()*1000000);
  }
  appData.wordGames[game_id] = {
    'channel': channel,
    'letters': letters,
    'words': found_words,
    'guesses': {},
    'bad_guesses': [],
    'longest_guess': 0,
    'longest_words': longest_words
  };
  var formatted_letters = "`" + letters.split('').join("` `") + "`"
  rtm.sendMessage(`${formatted_letters}  (${num_vowels} vowels, ${num_consonants} consonants)  you have 30 seconds.....`, channel);
  setTimeout(function() {
    end_game(game_id);
  }, 30000);
  return null;
}

function do_conundrum(channel) {
  var words = dictionary.wordsWithNLetters(9);
  var word_idx = Math.floor(Math.random()*words.length);
  var word = words[word_idx];
  var game_id = Math.floor(Math.random()*1000000);
  while (game_id in appData.conundrumGames) {
    game_id = Math.floor(Math.random()*1000000);
  }
  var letters = sample(word, 9);
  appData.conundrumGames[game_id] = {
    'channel': channel,
    'word': word,
    'letters': letters,
    'winner': null
  };
  var formatted_letters = "`" + letters.toUpperCase().split('').join("` `") + "`"
  rtm.sendMessage(`Conundrum is ${formatted_letters}   you have 30 seconds.....`, channel);
  setTimeout(function() {
    end_conundrum(game_id);
  }, 30000);
  return null;
}

function do_last_words_list(channel, args) {
  if (appData.lastWords.hasOwnProperty(channel)) {
    var words_list = appData.lastWords[channel].slice();
    var word_count = 0;
    var max_words = 100;
    var just_length = -1;
    var message = "The longest words out of " + words_list.length.toString() + " words from the last words game were:";
    if (args.length > 0) {
      if (args[0].toLowerCase() == "full") {
	max_words = -1;
	message = "The full list of " + words_list.length.toString() + " words from the last words game were:";
      } else {
	try {
	  just_length = parseInt(args[0]);
	  if (just_length > 0 && just_length <= words_list[0].length) {
	    message = "The " + just_length.toString() + " letter words in the last words game were:";
	    max_words = -1;
	  } else {
	    rtm.sendMessage("list word length out of range", channel);
	    return null;
	  }
	} catch (error) {
	  rtm.sendMessage("\"list " + args.join(' ') + "\" not understood!", channel);
	  return null;
        }
      }
    }
    message += "\n";
    var length = 10;
    while (words_list.length > 0 && (max_words < 0 || word_count < max_words)) {
      if (just_length > 0 && words_list[0].length != just_length) {
	words_list.splice(0,1);
	continue;
      }
      if (length != words_list[0].length) {
	length = words_list[0].length;
	message += length.toString() + " letter words:\n";
      }
      var max_per_line = 460/(length+2);
      var w = [];
      while (words_list.length > 0 && words_list[0].length == length) {
	w.push(words_list[0]);
	words_list.splice(0,1);
	if (w.length == max_per_line) {
	  message += "  " + w.join(", ");
	  if (words_list[0].length == length) {
	    message += ",";
	  }
	  message += "\n";
	  word_count += w.length;
	  w = [];
	}
      }
      if (w.length > 0) {
	message += "  " + w.join(", ");
	word_count += w.length;
      }
      message += "\n";
    }
    rtm.sendMessage(message, channel);
  } else {
    rtm.sendMessage("There has not been a words game on this channel", channel);
  }
}

function do_command(user, channel, cmd, args, ts) {
  if (commands.hasOwnProperty(cmd)) {
     commands[cmd].fn(user, channel, args, ts);
  }
}

const regex_one_or_more_spaces = new RegExp('\\s+');

function process_message(user, channel, text, ts) {
  if (!is_round_answer(user, channel, text, ts)) {
    var args = text.trim().split(regex_one_or_more_spaces);
    if (channel[0] == 'D') {
      // Direct message, don't need "@vorderbot"
      do_command(user, channel, args[0].toLowerCase(), args.slice(1), ts);
    } else {
      // Normal channel, check for "@vorderbot" as first word.
      if (args.length > 1 && is_nick(args[0], appData.selfId)) {
        do_command(user, channel, args[1].toLowerCase(), args.slice(2), ts);
      }
    }
  }
}

// The client will emit an RTM.AUTHENTICATED event on when the connection data is avaiable
// (before the connection is open)
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (connectData) => {
  // Cache the data necessary for this app in memory
  appData.selfId = connectData.self.id;
  appData.teamId = connectData.team.id;
  appData.conundrumGames = {};
  appData.wordGames = {};
  appData.numsGames = {};
  appData.numsFinishedGames = {};
  appData.calculating = [];
  appData.lastWords = {};
  console.log(`Logged in as ${appData.selfId} of team ${appData.teamId}`);
});

// The client will emit an RTM.RTM_CONNECTION_OPEN the connection is ready for
// sending and recieving messages
rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPEN, () => {
  console.log(`Ready`);
});

rtm.on(RTM_EVENTS.MESSAGE, (messageData) => {
  if (!messageData.hidden) {
    process_message(messageData.user, messageData.channel, messageData.text, messageData.ts);
  }
});

// Start the connecting process
rtm.start();
