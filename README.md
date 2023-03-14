# Node.js server for our InstaFoodies app


### How to run:

** Preparation **
You can find step by step guide here: https://www.youtube.com/watch?v=8Se_F7c03UM
1. Install node.js on your computer: https://nodejs.org/en/
2. Open a folder for the server
3. Clone the project there
4. Enter the folder in the terminal
5. copy this to the terminal: npm init
6. Press enter untill its done
7. copy this to the terminal: npm install express firebase-admin nodemon
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

** Run: **
1. copy this to the terminal: node .\server.js
