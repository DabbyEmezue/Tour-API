//THIS IS A SCRIPT THAT READS FILE FROM THE JSON AND TRASNFERS TO THE MONGO DATABASE
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const TourModel = require('./../../Models/tourModel');
const { argv } = require('process');

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
  }); //This connects Node to our online MongoDB database

//READ FILE
const tours = JSON.parse(fs.readFileSync('./tours-simple.json', 'utf-8'));

//IMPORT DATA INTO DATABASE

const ImportData = async () => {
  try {
    await TourModel.create(tours);
    console.log('Data successfully created');
  } catch (err) {
    console.log(err);
  }
};

//DELETE DATA FROM ALL THE DATA FROM A DATA BASE
const DeleteData = async () => {
  try {
    await TourModel.deleteMany();
    console.log('Data deleted successfully');
  } catch (err) {
    console.log(err);
  }
};

if (process.argv[2] === '--import') {
  ImportData();
} else if (process.argv[2 === '--delete']) {
  DeleteData();
}

ImportData();
