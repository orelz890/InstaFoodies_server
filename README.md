# Node.js server for our InstaFoodies app

<!-- Working on linux is prefered -->
### How to run:

***Preparation:***


You can find step by step guide here: https://www.youtube.com/watch?v=8Se_F7c03UM
0. install npm: npm install -g npm
1. Install node.js on your computer:
    windows: https://nodejs.org/en/
    ubuntu: sudo npm cache clean -f
            sudo npm install -g n
            sudo n latest
2. Open a folder for the server
3. Clone the project there
4. Enter the folder in the terminal
5. Copy this to the terminal: npm init
6. Press enter untill its done
7. Copy this to the terminal: npm install express firebase-auth firebase firebase-admin nodemon morgan apicache
   (nodemon - keeps the server running. It takes the changes we make to the server so we wont have to stop. In order for this to work add this:
    "scripts": {
        "start": "nodemon server.js",
        ...
    }
    in the package.json file)
 
8. Generate new private key that tells firebase that we are a reliable src
   (How to generate in firebase: 
   Project settings -> Service accounts -> Generate new private key 
                    -> open key.js file -> paste the key generated).
9. To install nginx (web server similar to apache):
    ubuntu: sudo apt install nginx
    windows: https://www.youtube.com/watch?v=3-3o3Yz4GvY
    Nginx full tutorial: https://www.youtube.com/watch?v=5PrT5uKszQo
10. How to use nginx as a load balancer:
    https://www.youtube.com/watch?v=2X4ZO5tO7Co&list=PLaiZP3KJsJOoFP4JwV_GlRfjmz-w54d1K&index=4
    In general: 
        * Check if nginx.conf is ok: nginx -t
        * Start nginx: start nginx
        * Reload nginx: nginx -s reload



***Run:***

***With nodemon**
1. Copy this to the terminal: npm start

***Without nodemon**
1. Copy this to the terminal: node .\server.js

***Without pm2**
* Link for more details: https://www.youtube.com/watch?v=oykl1Ih9pMg&list=PLatLJHenaEliXO6AVHwu_5nejsebpNFfB&index=5
* Use pm2 (process manager) if you want to run the server in the background and ensure that it automatically restarts in case of any errors or crashes.
1. First, copy this to your terminal: npm install -g pm2
2. Copy this to the terminal: pm2 start server.js
3. More command u should know:
     pm2 status - will show u all the apps that are running
     pm2 restart server.js
     pm2 stop server.js
     pm2 logs - will show all the console.logs
     pm2 flush - clears the logs
4. This script: powershell -ExecutionPolicy Bypass
5. In order to run multiple servers you need to listen in diffrent ports:
    First, install: 
        npm install --save-dev cross-env
    Then, enter this line: 
        npx cross-env PORT=3000 pm2 start --name server1 server.js
        with diffrent ports for each server ypu open.
guide: https://www.youtube.com/watch?v=14zY-u9EBCU
6. Enter: pm2 save



 will allow you to run scripts without changing the system's execution policy permanently if needed.


## Useful sources

### Note: For building the android side (client) you can follow the first half of this video:

https://www.youtube.com/watch?v=ycja50TzjoU


### Note: In the android side- Retrofit turns your HTTP API into a Java interface.

https://square.github.io/retrofit/

### Note: learned how to organize the files correctly in node.js:

https://www.youtube.com/watch?v=T8SZv6h2WbY

### Understanding how CRUD methods work with node.js + retrofit2 implementation:

https://www.youtube.com/playlist?list=PLrnPJCHvNZuCbuD3xpfKzQWOj3AXybSaM

***Retrofit tutorials:***  https://futurestud.io/tutorials/retrofit-2-how-to-delete-objects-on-the-server

***HTTP status codes:***  https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
