A simple tactical MMORPG made with Phaser 3, node.js and socket.io.

Demo is available here : https://liana-quest-41980538aff2.herokuapp.com/game

You will need to create a .env file from the .env.dist template.
TOKEN_SECRET and REFRESH_TOKEN_SECRET are simple strings that you can set as you like.

You will need a working email if you want to use the login system. Set it up in the EMAIL, PASSWORD and EMAIL_PROVIDER variables. Your email will need to be configured to accept use by external software (you will likely need to generate a special password for that).

You will need a mongoDB database to run the game. When it is setup, put the connection string in the MONGO_CONNECTION_URL variable.

Finally, to compile and start the project, just run :

```
npm install
npm start
node dist/server.js
```

## Credits for the assets :

- Sprites :
  https://opengameart.org/content/rpg-character-sprites
  by GrafxKid (https://opengameart.org/users/grafxkid)
- Font :
  https://www.dafont.com/dogica.font
  by Roberto Mocci (https://www.dafont.com/roberto-mocci.d8882)
- Tilesets :
  https://opengameart.org/content/outdoor-tiles-again
  https://opengameart.org/content/top-down-dungeon-tileset
  by Michele "Buch" Bucelli (https://opengameart.org/users/buch)
