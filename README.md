# Vorderbot

A Custom bot for slack.com that provides "words" and "numbers" rounds on
request.

## Installation

You will need node.js, npm and pyparsing python module installed. For example,
under ubuntu:
```
apt -y install python-pyparsing nodejs npm
```

Install _equ.py_, _sowpods.txt_, _vorderbot.js_, _package.json_ and
*vorderbot_slack.sh* in a directory somewhere. I create a user called vorderbot
and use its home directory. You will then need to install the node.js dependencies by changing to the directory and running `npm install` to pull in the dependencies.

Edit *vorderbot_slack.sh* to include the token you've generated on slack.com
for the Custom bot and set the proxy variables if needed.

Edit and install _vorderbot-slack.service_ into a suitable systemd directory. If
you've created a vorderbot user then use _~vorderbot/.config/systemd/user/_ as
the directory. You then just need to enable the service unit and start the
service, e.g.:
```
systemctl --user daemon-reload
systemctl --user enable --now vorderbot-slack
```

Operation
---------

Vorderbot should appear as an active user under the name you chose when you
registered the bot.

You can \/invite vorderbot into any channels you wish on the workspace you've
set the bot up on.

To talk to vorderbot to ask for a game or help, you will need to prefix your request with the username of vorderbot, e.g. "@vorderbot help". If you have direct messages vorderbot, then you do not need the username prefix.

Commands:
  - help    - Respond with a short help message.
  - words   - Start a words game. Players have 30 seconds to respond with the
              longest word they can. Players do not need to prefix their answers
              with the vorderbot username. Vorderbot will take any single word
              comment on the channel that only uses the letters provided as an
              answer.
  - numbers - Start a numbers game. Players have 30 seconds to respond with an
              equation that equals the target or is within 10 of the target.
              Players do not need to prefix their answers with the vorderbot
              username. Vorderbot will take any comment on the channel that
              looks like an equation that only uses the given numbers as an
              answer.
  - list [n]- List the words found for the last completed words game.
              Optionally a number may be given to restruct the words to only
              those containing /n/ letters.
