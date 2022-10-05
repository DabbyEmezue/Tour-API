const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'], // This means that it is required that a tour has a name (true), and the false should display 'A tour must have a name'
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less than 40 characters'],
      minlength: [10, 'A tour must have more than 10 characters'],
      //validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a diffculty'],
      enum: {
        values: ['easy', 'medium', 'difficult'], //accepts only easy, medium or difficult string
        message: 'Tour can either be easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'rating must be above 1.0'],
      max: [5, 'rating must be below 5.0'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a set price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          //this only points to current doc on NEW document
          return val < this.price;
        },
        message: 'Discount Price ({VALUE}) Should Be Less Than Regular Price',
      },
    },
    summary: {
      type: String,
      trim: true, //to remove spaces at the beginning and the end of stuff
      required: [true, 'A summary is needed'],
    },
    description: { type: String, trim: true },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a color image'],
    },
    images: [String],
    createdAt: { type: Date, default: Date.now, select: false }, //setting select to false makes sure that the createdAt parameter is not sent to the user when a get request is initiated
    startDates: [Date],
    secretTour: { type: Boolean, default: false },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

//Virtual properties are used when you want to implement functions that you do not want to save in the main database to save space. E.g duration in weeks when we have it in days
tourSchema.virtual('durationWeeks').get(function () {
  //we used 'function' and not ()=> {} here because we wanted to utilize 'this' which  arrowhead does not have
  return this.duration / 7;
});

//DOCUMENT MIDDLEWARE (Mongoose Middleware Type)
//Runs before .save() and .create() commands
tourSchema.pre('save', function (next) {
  //
  this.slug = slugify(this.name, { lower: true });
  next();
});

//runs after the documents have been saved or created
tourSchema.post('save', function (doc, next) {
  //doc is the final saved document
  next();
});

//QUERY MIDDLEWARE.
//This is called before a query is called.
tourSchema.pre(/^find/, function (next) {
  //that funny stuff means all queries with find will be called by this function
  this.start = Date.now();
  this.find({ secretTour: { $ne: true } }); //this here refers to the query object
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  //this is the post middleware for query and ity has access to the documents returned from the database.
  console.log(`This Query took ${Date.now() - this.start}`);
  next();
});

//AGGREGATION MIDDLEWARE

tourSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  console.log(this);
  next();
});

//Now we create a model
const TourModel = mongoose.model('TourModel', tourSchema); //This creates a tour with the tourschema pattern

module.exports = TourModel;
