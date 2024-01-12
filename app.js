require('dotenv').config();
const express = require('express');
const passport = require('passport');
require('passport-setup.js'); // Path to the passport-setup file

const app = express();

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Google Auth Route
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

// Add other routes here

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
