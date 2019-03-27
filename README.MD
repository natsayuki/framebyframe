# Uh, Frame By Frame is a game where you draw an animation one frame at a time with other people.

### How to use and stuff
#### To play
  * Go to the Frame By Frame website (working version at https://fbfgame.herokuapp.com)
  * To create a lobby click the CREATE LOBBY button in the top left corner
    * Here you will be prompted to enter a name.  Names must be at least four letters and duplicates are not allowed
  * Once you have created a lobby, you are the lobby leader
    * If you are the lobby leader you can
      1. Change the amount of rounds in the game
      1. Change the amount of time each turn takes
      1. Toggle whether or not you will be drawing a frame of the animation
      1. Re-roll the randomly generated prompt for the animation
    * If you want to invite other people to join your lobby, simply give them the key at the top right of the screen
    * If you have a key and want to join a lobby, enter the key in the input box labeled Room Code and click JOIN

#### Other things
  * If you want to have a custom room code, change the key parameter in the URL in the room subdirectory to what you desire
    * Eg. https://fbfgame.herokuapp.com/room?key=mycustomkey
  * If you want to have a custom prompt for the animation open a console in your browser and type in the following with your prompt where it says "prompt here"
    * '''javascript prompt('prompt here')'''
    * I might actually implement this in the lobby later if I care enough to and I remember
    * Also this doesn't work on mobile for obvious reasons

### If you find bugs or anything, please don't tell me 'cause I probably don't care
