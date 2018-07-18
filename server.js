/*
 * Grab our packages, models, and config
 * configure our apps: set important vars, config packages, connect db
 * create basic routes
 * creat API routes
 *   POST: http://localhost:8080/api/authenticate
 *   GET:  http://localhost:8080/api
 *   GET:  http:localhost:8080/api/users
 */

const express     = require('express'); //popular node framework
const app         = express();
const bodyParser  = require('body-parser'); // let us get parameters from POST
const morgan      = require('morgan'); // log req to see what is happening
const mongoose    = require('mongoose'); // interacts with mongoDB database

const jwt     = require('jsonwebtoken'); // create, sign, verify tokens
const config  = require('./config'); // get config file
const User    = require('./app/models/user'); // get mongoose model

/*
 * Configuration
 */

const port = process.env.PORT || 8080; // used to create, sign, and verify tokens
const uri = 'mongodb://localhost:27017/testJWT';  // mongodb://localhost - will fail
const options = { useNewUrlParser: true }; // DeprecationWarning: current URL string parser is deprecated

mongoose.connect(config.database, options); //connect to DB
app.set('superSecret', config.secret); // secret variable

// use body parser so we can get info from POST and/or URL params
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

// use morgan to log requests to console
app.use(morgan('dev'));

/*
 * ROUTES
 * basic routes
 */

 app.get('/', function (req, res) {
  res.send('Hello THERE! API is at http://localhost:' + port + '/api');
 });

 /*
  * API ROUTES
  */
app.get('/setup', function (req, res) {

  // create a sample user
  const nick = new User ({ 
    name: 'Nick Cerminara', 
    password: 'password',
    admin: true 
  });

  // save the sample user
  nick.save(function (err) {
    if (err) throw err;

    console.log('User saved successfully');
    res.json({ success: true });
  });
});

// get instance of router for api routes
const apiRoutes = express.Router();

// TODO: route to auth user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function (req, res) {
  // find user
  User.findOne({
    name: req.body.name
  }, function (err, user) {
    if (err) throw err;
    if (!user) {
      res.json({ success: false, message: 'Auth failed, User mia.' });
    } else if (user) {
      // check if pw matches
      if (user.password != req.body.password) {
        res.json({ success: false, message: 'Auth failed, wrong pw.' });
      } else {
        // if user found and pw is right
        // create token with only given payload
        // dont want to pass in whole user since it contains pw
        const payload = {
          admin: user.admin
        };
        const token = jwt.sign(payload, app.get('superSecret'), {
          // expiresInMinutes: 1440 //expires in 24 hours
          // https://stackoverflow.com/questions/37629475/validationerror-expiresinminutes-is-not-allowed-nodejs-jsonwebtoken
          // the above no longer works, use expiresIn instead
          expiresIn : 60*60*24
        });

        // reutnrs info including token as JSON
        res.json({
          success: true,
          message: 'Enjoy your token!',
          token: token
        });
      }
    }
  });
});

// TODO: route middleware to verify token
// using jsonwebtoken package to verify token passed in
// make sure secret matches the one used to create token
// and all is good then pass to other routes in req obj
apiRoutes.use(function (req, res, next) {
  // check header or url params or post params for token
  const token = req.body.token || req.query.token || req.headers['x-access-token'];

  // decode token
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, app.get('superSecret'), function (err, decoded) {
      if (err) {
        return res.json({ success: false, message: 'Failed to auth token.' });
      } else {
        // if everything is good, save to req for use in other routes
        req.decoded = decoded;
        next();
      }
    });
  } else {
    // if no token returns error
    return res.status(403).send({
      success: false,
      message: 'No token provided.'
    })
  }
});

// route to show random message
apiRoutes.get('/', function (req, res) {
  res.json({ message: 'welcome to cooolest API on URF!'});
});

// routes to return all users: (GET http://localhost:8080/api/users)
apiRoutes.get('/users', function (req, res) {
  User.find({}, function (err, users) {
    res.json(users);
  });
});

// apply routes to out applications with prefix /api
app.use('/api', apiRoutes);

/*
* START SERVER
*/
app.listen(port);
console.log('magic happens at http://localhost:' + port);
