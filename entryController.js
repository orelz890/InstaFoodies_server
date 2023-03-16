const { Request, Response } = require("express")
const { db } = require('./config/firebase')

// type EntryType = {
//     title: string,
//     text: string,
//   };

const signupHendler = async (req, res) => {
    try{
        // This is the body of the request. We constructed an object from this data.
        const id = req.body.email;

        const newUserJson = {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
        };
            
        // Adding this user to our database
        const user = db.collection("users").doc(id).get();
        if (!(await user).exists){
            const response = await db.collection("users").doc(id).set(newUserJson);
            console.log("signup: Client " + req.body.email + " signed up");
            return res.status(200).send();
        }else {
            console.log("signup: User {" + (await user).data().email +  "} already exist..");
            return res.status(400).send();

        }

    } catch(error) {
        return res.status(400).send(error);
    }
};



const loginHendler = async (req, res) => {

    // This is the body of the request. We constructed an object from this data.
    const id = req.body.email;

    // Adding this user to our database
    const user = db.collection("users").doc(id).get()
    .then(doc => {
        if (doc.exists) {
            const jsonData = JSON.stringify(doc.data());
            console.log(jsonData);
            return res.status(200).send(jsonData);

        } else {
            console.log('login: Document not found!');
        }
    }).catch(error => {
        console.log('login: Error getting document:', error);
        return res.status(400).send(error);

    });
};


const getUserHendler = async (req, res) => {
    
    const id = req.params.email;

    console.log("in getUser: " + id);

    db.collection("users").doc(id).get()
    .then(doc => {
        if (doc.exists) {
            const jsonData = JSON.stringify(doc.data());
            console.log(jsonData);
            return res.status(200).send(jsonData);

        } else {
            console.log('getUser: Document not found!');
        }
    }).catch(error => {
        console.log('getUser: Error getting document:', error);
        return res.status(400).send(error);

    });
};


const patchUser = async (req, res) => {
    
    const { body, params: {email}} = req;
    const { password } = body;
    const id = email;
    console.log("in patchUser: " + email);

    const newUserJson = {
        password: password
    };

    console.log("in patchUser");

    await db.collection("users").doc(id).update(newUserJson)
    .then(() => {
        console.log("patchUser: Successfully updated user- {" + id + "}");
        return res.status(200).send();
    })
    .catch((error) => {
        console.log("patchUser: Failed to update user- {" + id + "}");
        return res.status(400).send();
    });
};



const deleteObjectFromRefHendler = async (req, res) => {
    console.log("im in delete");
    const { params: {ref , email}} = req;
    const id = email; // get the ID of the document to delete
    console.log('ref = ' + ref + ', id = ' + id);

    await db.collection(ref).doc(id).delete()
      .then(() => {
        console.log('Document deleted successfully');
        return res.status(200).send();
      })
      .catch((error) => {
        console.error(error);
        return res.status(400).send();
      });
  };

  module.exports = { signupHendler, loginHendler, getUserHendler, patchUser, deleteObjectFromRefHendler};
