1. install node v14+ (using nvm)
> nvm install 14.15.4

> nvm use 14.15.4
2. run npm install
> npm i
3. create file `secrets.json` in the root of the project and paste inside the following structure with the RIGHT value for each property ;)
```json
{
    "DISCORD_BOT_TOKEN": "SuPeR_SeCrEt_DiScOrD_ToKeN"
}
```
4. go into build mode 
> npm run watch
5. edit code and in new terminal type
> npm start
6. observe & (fix|add) & repeat (note: for each modification npm start has to be rerun.)
7. when happy lint your code to see if it needs fixes
> npm run lint -- --fix
8. git branch -> git commit -> git push -> merge request master.
