class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString }; //This creates an object with all the elements of the rep.query. From here the goal is to remove keywords like page which is present in the query
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]); //deletes each element in excludedFields from the queryObject.

    //1B) ADVANCED FILTERING
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, (match) => `$${match}`); //this replaces gte with $gte because thats what mongodb understands

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy); //if there exists a sort, sort the query (already fetched data from our tour model according to the defined sorting parameter)
    } else {
      this.query = this.query.sort('-createdAt'); // we want it to be sorted by newest if there is so sorting query in the request
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit); //skip function skips the inputted number of pages. limit is the amount of pages to be shown per page
    return this;
  }
}

module.exports = APIFeatures;
