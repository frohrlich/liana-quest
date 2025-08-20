A simple tactical MMORPG made with Phaser 3, node.js and socket.io.

You will need to create a .env file from the .env.dist template:
```
cp .env.dist .env
```

You should change the TOKEN_SECRET and REFRESH_TOKEN_SECRET.

You will need a mongoDB database to run the game (except if you use the docker version, which provides one). When it is setup, put the connection string in the MONGO_CONNECTION_URL variable.

[OPTIONAL] You will need a working gmail account if you want to use the forgot password system. Set it up in the EMAIL, PASSWORD and EMAIL_PROVIDER variables.
The password should be an application password (see https://support.google.com/accounts/answer/185833).

Finally, to compile and start the project, just run:
```
npm install
npm run build
npm start
```

For development, use:
```
npm run buildDev
npm run startDev
```

You can also use the docker version, which contains a default mongoDB database:
```
docker compose up
```
In that case, make sure to use the default MONGO_CONNECTION_URL in the `.env.dist` file.


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
