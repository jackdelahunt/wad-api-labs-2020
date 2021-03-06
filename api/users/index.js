import express from 'express';
import User from './userModel';
import jwt from "jsonwebtoken";
import movieModel from "../movies/movieModel"


const router = express.Router(); // eslint-disable-line

// Get all users
router.get('/', (req, res, next) => {
    User.find()
    .then(users =>  res.status(200).json(users))
    .catch(next);
});

// get all favourites of a user
router.get('/:userName/favourites', (req, res, next) => {
  const userName = req.params.userName;
  User.findByUserName(userName).populate('favourites').then(
    user => res.status(201).json(user.favourites)
  ).catch(next);
});

// Get a single user
router.get('/:userName', (req, res, next) => {
  const userName = req.params.userName;
  User.findByUserName(userName).then(
    user => res.status(201).json(user)
  ).catch(next);
});

// delete a single user
router.delete('/:userName', (req, res, next) => {
  const userName = req.params.userName;
  User.findByUserName(userName).then((user) => {

    if(user == null) {
      res.status(401).json({
        success: false,
        msg: `${userName} not found`  
      }).catch(next)
    } else {
      User.deleteOne({_id: user._id})
      .then(res.status(201).json({
        success: true,
        msg: `${userName} deleted`
      }))
      .catch(next);
    }
  }).catch(next);
});


// register
router.post('/', async (req, res, next) => {
  if (!req.body.username || !req.body.password) {
    res.status(401).json({
      success: false,
      msg: 'Please pass username and password.',
    });
  }
  if (req.query.action === 'register') {
    await User.create(req.body).catch(next);
    res.status(201).json({
      code: 201,
      msg: 'Successful created new user.',
    });
  } else {
    const user = await User.findByUserName(req.body.username).catch(next);
      if (!user) return res.status(401).json({ code: 404, msg: 'Authentication failed. User not found.' });
      user.comparePassword(req.body.password, (err, isMatch) => {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          const token = jwt.sign(user.username, process.env.secret);
          // return the information including token as JSON
          res.status(200).json({
            success: true,
            token: 'BEARER ' + token,
          });
        } else {
          res.status(401).json({
            code: 401,
            msg: 'Authentication failed. Wrong password.'
          });
        }
      });
    }
});


// add a favourite to a user
router.post('/:userName/favourites', async (req, res, next) => {
  const newFavourite = req.body.id;
  const userName = req.params.userName;

  const movie = await movieModel.findByMovieDBId(newFavourite).catch(next);
  if(!movie) {
    return res.status(404).json({ code: 404, msg: 'Movie not found.' });
  }

  const user = await User.findByUserName(userName).catch(next);
  if(!user) {
    return res.status(404).json({ code: 404, msg: 'User not found.' });
  }

  if(user.favourites.includes(movie._id)) {
    return res.status(409).json({ code: 409, msg: 'Favourite already exists' });
  }

  await user.favourites.push(movie._id);
  await user.save(); 
  res.status(201).json(user); 
});

// delete a favourite from a user
router.delete('/:userName/favourites', async (req, res, next) => {
  const userName = req.params.userName;
  const id = req.body.id;
  const movie = await movieModel.findByMovieDBId(id).catch(next);
  const user = await User.findByUserName(userName).catch(next);

  if(!movie) {
    return res.status(404).json({ code: 404, msg: 'Movie not found.' });
  }

  if(!user) {
    return res.status(404).json({ code: 404, msg: 'User not found.' });
  }

  if(!user.favourites.includes(movie._id)) {
    return res.status(404).json({ code: 409, msg: 'Favourite does not exist' });
  }

  await user.favourites.pull(movie._id);
  await user.save(); 
  res.status(201).json({
    success: true,
    msg: "favourite deleted"
  }); 


});

// Update a user
router.put('/:id',  (req, res, next) => {
    if (req.body._id) delete req.body._id;
     User.update({
      _id: req.params.id,
    }, req.body, {
      upsert: false,
    })
    .then(user => res.json(200, user))
    .catch(next);
});
export default router;