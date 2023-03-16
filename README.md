# Node.js server for our InstaFoodies app


### How to run:

***Preparation:***


You can find step by step guide here: https://www.youtube.com/watch?v=8Se_F7c03UM
1. Install node.js on your computer: https://nodejs.org/en/
2. Open a folder for the server
3. Clone the project there
4. Enter the folder in the terminal
5. Copy this to the terminal: npm init
6. Press enter untill its done
7. Copy this to the terminal: npm install express firebase-admin nodemon
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

***Run:***

***With nodemon**
1. Copy this to the terminal: npm start

***Without nodemon**
1. Copy this to the terminal: node .\server2.js


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
