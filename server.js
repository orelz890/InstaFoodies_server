// using the express module as our server using the require methood
import express from 'express';
import {reportIllegalPostHandler, followUnfollowHandler, deleteProfilePostsHandler, getLikedOrCartPostsHandler, addOrRemoveCartPostHandler, addOrRemoveLikeToPostCommentHandler, getPostCommentsHandler, addCommentToPostHandler, addOrRemovePostLikedHandler, getProfileFeedPostsHandler, getUserFeedPostsHandler, uploadNewPostHandler, uploadProfilePhotoHandler, getBothUserAndHisSettingsHandler, getFollowingUsersAndAccountsHandler, getContactsUsersAndSettingsHandler, getRequestsHandler, getContactsHandler, getFollowingUsersHandler, getChatGroupHandler, createNewChatGroupHandler, executeCheckUserNameHandler, signupHendler, loginHendler, getUserHendler, patchUserHandler, patchUserAccountSettingsHandler, deleteObjectFromRefHendler } from './entryController.js';
import morgan from 'morgan';
import apicache from 'apicache';

const app = express()

// Initialize apicache middleware with options
const options = {
    defaultDuration: '1 hour',
    enabled: true,
    statusCodes: {
      include: [200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 304],
    },
    headers: {
      'cache-control': 'no-cache',
    },
    afterHit: (req, res, key, hit) => {
      console.log('Cache hit for key', key);
    },
  };

// const cache = apicache.middleware(options);
const cache = apicache.options(options).middleware;


// POST will have a body of type json so we need to enable json in express.
app.use(express.json());

app.use(express.urlencoded({extended: true}));

app.use(morgan('dev'));



/**
 * Middleware function to check if a cached response can be returned.
 * @param req Request object
 * @param res Response object
 * @param next Next middleware function
 */
const checkCache = (req, res, next) => {
    const index = apicache.getIndex();
    if(index instanceof Map){
        console.log("index= " + index + '\n');
        const cachedResponse= index.get(req.originalUrl);
        if (cachedResponse) {
          // Check if cached response has been modified
          const lastModified = new Date(cachedResponse['Last-Modified']);
          const ifModifiedSince = new Date(req.headers['if-modified-since']);
          if (!isNaN(ifModifiedSince) && lastModified <= ifModifiedSince) {
            // Response has not been modified, return 304 Not Modified
            return res.status(304).send();
          }
          res.set(cachedResponse.headers);
          res.send(cachedResponse.body);
        } else {
          next();
        }
    }
    next();
  };



/**
 * Creating a new user if don't exist already.
 * When singing up the app will send a post request to the server.
 * It will get the route and the call back func that will be exacuted when any request to this route comes.
 * @param name the first {@code string}
 * @param email the second {@code string}
 * @param password the third {@code string}
 * @returns Void
 */
app.post('/signup', signupHendler)


/**
 * Loging in if user exists
 * @param email the only {@code string}
 * @param password the second {@code string}
 * @returns User {@code json}
 */
app.post('/login', cache('1 second') , checkCache, loginHendler);


/**
 * Returns a specific user
 * @param uid {@code string}
 * @returns User {@code json}
 */
app.get('/getUser/:uid', (req, res) => {
  getUserHendler(req, res, "users");
});

/**
 * Returns a specific user
 * @param uid {@code string}
 * @returns User_account_settings {@code json}
 */
app.get('/getUserAccountSettings/:uid', (req, res) => {
  getUserHendler(req, res, "users_account_settings");
});

/**
 * Updates user info
 * @param uid {@code string}
 * @body map {@code Map<String, String>}
 * @returns Void
 */
app.patch('/patchUser/:uid', (req, res) => {
  patchUserHandler(req, res, "users");
});

/**
 * Updates user account settings info
 * @param uid {@code string}
 * @body map {@code Map<String, String>}
 * @returns Void
 */
app.patch('/patchUserAccountSettings/:uid', (req, res) => {
  patchUserAccountSettingsHandler(req, res, "users_account_settings");
});


/**
 * Delete an object assosiated with @id from the given reference in firebase. 
 * @param ref the first {@code string}
 * @param email the second {@code string}
 * @returns Void
 */
app.delete('/deleteObjectFromRef/:ref/:uid', deleteObjectFromRefHendler)


/**
 * Check if the username is taken. 
 * @param username {@code string}
 * @returns boolean
 */
app.get('/checkUserName/:username', executeCheckUserNameHandler)


// ====================================== Chat =========================

/**
 * Create a new chat group for a user. 
 * @param name {@code string}
 * @param uid {@code string}
 * @returns boolean
 */
app.post('/createNewChatGroup/:uid/:name', createNewChatGroupHandler)

/**
 * Create a new chat group for a user. 
 * @param uid {@code string}
 * @returns boolean
 */
app.get('/getUserChatGroups/:uid', getChatGroupHandler)


/**
 * Get all the user followings users. 
 * @param uid {@code string}
 * @returns List of U
 */
app.get('/getFollowingUsers/:uid', (req, res) => { 
  getFollowingUsersHandler(req, res, "users")})


  /**
 * Get all the user followings users. 
 * @param uid {@code string}
 * @returns List of U
 */
app.get('/getFollowingUsersAccountSettings/:uid', (req, res) => { 
  getFollowingUsersHandler(req, res, "users_account_settings")})



  /**
 * Get all the user contacts users. 
 * @param uid {@code string}
 * @returns List of Users
 */
app.get('/getContactsUsers/:uid', (req, res) => { 
  getContactsHandler(req, res, "users")})



  /**
 * Get all the user contacts settings. 
 * @param uid {@code string}
 * @returns List of Account settings
 */
  app.get('/getContactsSettings/:uid', (req, res) => { 
    getContactsHandler(req, res, "users_account_settings")})


    /**
 * Get all the Requests. 
 * @param uid {@code string}
 * @returns List of Account settings
 */
    app.get('/getFollowingUsersAndAccounts/:uid', (req, res) => { 
      getFollowingUsersAndAccountsHandler(req, res)})
  
  
    /**
 * Get all the Requests. 
 * @param uid {@code string}
 * @returns List of Account settings
 */
    app.get('/getContactsUsersAndSettings/:uid', (req, res) => { 
      getContactsUsersAndSettingsHandler(req, res)})
  
    
    
  /**
 * Get all the Requests. 
 * @param uid {@code string}
 * @returns List of Account settings
 */
  app.get('/getRequests/:uid', (req, res) => { 
    getRequestsHandler(req, res)})

    
  /**
 * Get both the user and his account settings. 
 * @param uid {@code string}
 * @returns User & UserAccountSettings
 */
  app.get('/getBothUserAndHisSettings/:uid', (req, res) => { 
    getBothUserAndHisSettingsHandler(req, res)})

    
  /**
 * Upload Profile Photo. 
 * @param uid {@code string}
 * @param image_uri {@code string}
 * @returns none
 */
  app.patch('/uploadProfilePhoto/:uid/:image_uri', (req, res) => { 
    uploadProfilePhotoHandler(req, res)})


// ================================= Post ==============================
  /**
 * Upload New Post. 
 * @param uid {@code string}
 * @returns none
 */
  app.patch('/uploadNewPost/:uid', (req, res) => { 
    uploadNewPostHandler(req, res)})


  /**
 * get User Feed Posts for the front page of the app. 
 * @param uid {@code string}
 * @returns User & UserAccountSettings
 */
  app.get('/getUserFeedPosts/:uid', (req, res) => { 
    getUserFeedPostsHandler(req, res)})


  /**
 * Get both the user and his account settings. 
 * @param uid {@code string}
 * @returns User & UserAccountSettings
 */
  app.get('/getProfileFeedPosts/:uid', (req, res) => { 
    getProfileFeedPostsHandler(req, res)})

  /**
 * Add Or remove like to Post. 
 * @param uid {@code string}
 * @param postOwnerId {@code string}
 * @param postId {@code string}
 * @returns void
 */
  app.patch('/addOrRemovePostLiked/:uid/:postOwnerId/:postId', (req, res) => { 
    addOrRemovePostLikedHandler(req, res)})


/**
 * Add new comment to a post. 
 * @param postOwnerId {@code string}
 * @param postId {@code string}
 * @param uid {@code string}
 * @param comment {@code string}
 * @returns Comment
 */
app.post('/addCommentToPost/:postOwnerId/:postId/:uid/:comment/:name/:photo/:commentId', (req, res) => { 
  addCommentToPostHandler(req, res)})


  /**
 * Get the comments of a spesific post. 
 * @param postOwnerId {@code string}
 * @param postId {@code string}
 * @returns comments
 */
app.get('/getPostComments/:postOwnerId/:postId', (req, res) => { 
  getPostCommentsHandler(req, res)})

/**
 * Add or remove like to a comment in a spesific post. 
 * @param postOwnerId {@code string}
 * @param postId {@code string}
 * @param uid {@code string}
 * @param position {@code int}
 * @returns boolean
 */
  app.post('/addOrRemoveLikeToPostComment/:postOwner/:postId/:uid/:position', (req, res) => { 
    addOrRemoveLikeToPostCommentHandler(req, res)})

// ======================================= profile =======================================

/**
 * Get the user cart posts. 
 * @param uid {@code string}
 * @returns posts
 */
  app.get('/getCartPosts/:uid', (req, res) => { 
    getLikedOrCartPostsHandler(req, res, "users_cart_posts")})


/**
 * Add or remove recipe post to cart. 
 * @param uid {@code string}
 * @param postOwnerId {@code string}
 * @param postId {@code string}
 * @returns boolean
 */
app.patch('/addOrRemoveCartPost/:uid/:postOwnerId/:postId', (req, res) => { 
  addOrRemoveCartPostHandler(req, res)})


/**
 * Get the user liked posts. 
 * @param uid {@code string}
 * @returns posts
 */
  app.get('/getLikedPosts/:uid', (req, res) => { 
    getLikedOrCartPostsHandler(req, res, "users_liked_posts")})
  

/**
 * Get the user liked posts. 
 * @param uid {@code string}
 * @param PostsId {@code List<String>}
 * @returns posts
 */
app.patch('/deleteProfilePosts/:uid', (req, res) => { 
  deleteProfilePostsHandler(req, res)})


/**
 * Follow or unfollow a friend. 
 * @param uid {@code string}
 * @param friendUid {@code string}
 * @param followOrNot {@code string}
 * @returns success flag {@code boolean}
 */
app.patch('/followUnfollow/:uid/:friendUid/:followOrNot', (req, res) => { 
  followUnfollowHandler(req, res)})


// ====================== ML KIT ==============================
/**
 * Report an illegal post  
 * @param uid {@code string}
 * @param post_id {@code string}
 * @returns void
 */
app.patch('/reportIllegalPost/:uid/:post_id', (req, res) => { 
  reportIllegalPostHandler(req, res)})



/* Start to listen
   If planning to deploy this app to cloud application some times the port is not 8080 by defualt so it will take whatever port that is open for there case.
*/
const PORT = process.env.PORT || 8080;
console.log("port=" + PORT);
console.log("ENVport=" + process.env.PORT);
app.listen(PORT, () => {
    console.log("Server is running on PORT " + PORT + ".");
});
