const { expect } = require("chai");

const hasCallback = require('../../lib/utils/has-callback');

describe('has-callback', () => {

  it('should return true when last argument is called `callback`', async () => {
    expect(await hasCallback((db, callback) => {
      return callback();
    })).to.equal(true);
  });

  it('should return true when last argument is called `callback_`', async () => {
    expect(await hasCallback((db, callback_) => {
      return callback_();
    })).to.equal(true);
  });

  it('should return true when last argument is called `cb`', async () => {
    expect(await hasCallback((db, cb) => {
      return cb();
    })).to.equal(true);
  });

  it('should return true when last argument is called `cb_`', async () => {
    expect(await hasCallback((db, cb_) => {
      return cb_();
    })).to.equal(true);
  });

  it('should return true when last argument is called `next`', async () => {
    expect(await hasCallback((db, next) => {
      return next();
    })).to.equal(true);
  });

  it('should return true when last argument is called `next_`', async () => {
    expect(await hasCallback((db, next_) => {
      return next_();
    })).to.equal(true);
  });

  it('should return true when last argument is called `done`', async () => {
    expect(await hasCallback((db, done) => {
      return done();
    })).to.equal(true);
  });

  it('should return true when last argument is called `done_`', async () => {
    expect(await hasCallback((db, done_) => {
      return done_();
    })).to.equal(true);
  });

});
