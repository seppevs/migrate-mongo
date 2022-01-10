const { expect } = require("chai");

const hasCallback = require('../../lib/utils/has-callback');

describe('has-callback', () => {

  it('should return true when last argument is called `callback`', () => {
    expect(hasCallback((db, callback) => callback())).to.equal(true);
  });

  it('should return true when last argument is called `callback_`', () => {
    expect(hasCallback((db, callback_) => callback_())).to.equal(true);
  });

  it('should return true when last argument is called `cb`', () => {
    expect(hasCallback((db, cb) => cb())).to.equal(true);
  });

  it('should return true when last argument is called `cb_`', () => {
    expect(hasCallback((db, cb_) => cb_())).to.equal(true);
  });

  it('should return true when last argument is called `next`', () => {
    expect(hasCallback((db, next) => next())).to.equal(true);
  });

  it('should return true when last argument is called `next_`', () => {
    expect(hasCallback((db, next_) => next_())).to.equal(true);
  });

  it('should return true when last argument is called `done`', () => {
    expect(hasCallback((db, done) => done())).to.equal(true);
  });

  it('should return true when last argument is called `done_`', () => {
    expect(hasCallback((db, done_) => done_())).to.equal(true);
  });

});
