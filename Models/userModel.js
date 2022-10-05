const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator'); //this is a library that has all sorts of validators (like email)
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tell us your name'],
    trim: true,
  },

  email: {
    type: String,
    required: [true, 'An Email address is needed to create a user profile'],
    unique: [true, 'Email already registered. Try another'],
    trim: true,
    lowercase: true,
    validate: [validator.isEmail, 'Enter a valid E-mail address'],
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
    required: true,
  },
  password: {
    type: String,
    required: [true, 'Enter a valid password'],
    minlength: 8,
    select: false, //password will not show in user output
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please re-enter password'],
    //the validator below only works on CREATE (method we use when creating documents with mongodb) and SAVE but not when you want to update
    validate: {
      validator: function (el) {
        return el === this.password; //this returns true of false if the el which is passwordconfirm is equal to password
      },
      message: 'Passwords are not the same',
    },
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangedAt: Date,
  active: {
    type: Boolean,
    default: true,
    select: false, // let it not show in the output
  },
});

userSchema.pre('save', async function (next) {
  //pre middleware for the save function. when we are saving/creating to the db
  if (!this.isModified('password')) return next(); //if the password in the document has not been modified return from the function

  this.password = await bcrypt.hash(this.password, 12); //this encrypts the password. the number is the salt value which is how CPU intensive the hashing should be. 12 is optimal. Higher numbers
  this.passwordConfirm = undefined; //we delete the password confirm so that it it does not get saved to the database
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isnew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } }); // this finds only documents with their active set to true
  next();
});

userSchema.methods.correctPassword = async function (
  //method that is available on every document instance i.e every user
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword); //this function returns true if the password the user inputs when he is logging in (candidate pa)
};

//////////

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000);
    console.log(changedTimeStamp, JWTTimeStamp);
    return JWTTimeStamp < changedTimeStamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex'); //this is the token that will be sent to the users email and will be confirmed to the hash of the same token that we will store in our database

  this.passwordResetToken = crypto //here we store the hash of the reset token in our database. we cant store the resettoken itself becasue of hacks
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // this is after how long we want the token to expire (10 minutes)

  return resetToken;
};

///////////////////////////////////////////////////////////////////////////////////

const User = mongoose.model('User', userSchema);

module.exports = User;
