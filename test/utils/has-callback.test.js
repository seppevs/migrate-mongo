const { expect } = require("chai");

const hasCallback = require('../../lib/utils/has-callback');

describe('has-callback', () => {

  it('should return true when last argument is called `callback`', () => {
    expect(hasCallback((db, callback) => {
      return callback();
    })).to.equal(true);
  });

  it('should return true when last argument is called `callback_`', () => {
    expect(hasCallback((db, callback_) => {
      return callback_();
    })).to.equal(true);
  });

  it('should return true when last argument is called `cb`', () => {
    expect(hasCallback((db, cb) => {
      return cb();
    })).to.equal(true);
  });

  it('should return true when last argument is called `cb_`', () => {
    expect(hasCallback((db, cb_) => {
      return cb_();
    })).to.equal(true);
  });

  it('should return true when last argument is called `next`', () => {
    expect(hasCallback((db, next) => {
      return next();
    })).to.equal(true);
  });

  it('should return true when last argument is called `next_`', () => {
    expect(hasCallback((db, next_) => {
      return next_();
    })).to.equal(true);
  });

  it('should return true when last argument is called `done`', () => {
    expect(hasCallback((db, done) => {
      return done();
    })).to.equal(true);
  });

  it('should return true when last argument is called `done_`', () => {
    expect(hasCallback((db, done_) => {
      return done_();
    })).to.equal(true);
  });

});
