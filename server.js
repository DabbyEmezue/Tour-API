const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = require('./app');

dotenv.config({ path: './config.env' });
const DB = process.env.DATABASE; //This creates the variable DB in this file and assigns it to our databse connection string from the DATABASE file

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then((con) => {
    console.log('DB connection successful');
  })
  .catch((err) => console.log('ERROR')); //This connects Node to our online MongoDB database

//////////////////////////////
//Listening for Requests
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UMHANDLED REJECTION! SHUTTING DOWN');
  server.close(() => process.exit(1));
});
