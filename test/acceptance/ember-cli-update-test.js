'use strict';

const path = require('path');
const expect = require('chai').expect;
const tmp = require('tmp');
const fs = require('fs-extra');
const gitFixtures = require('git-fixtures');

const gitInit = gitFixtures.gitInit;
const commit = gitFixtures.commit;
const postCommit = gitFixtures.postCommit;
const processBin = gitFixtures.processBin;
const _fixtureCompare = gitFixtures.fixtureCompare;

const commitMessage = 'add files';

function buildTmp(
  fixturesPath,
  tmpPath,
  dirty,
  subfolder
) {
  gitInit({
    cwd: tmpPath
  });

  let copyPath = tmpPath;
  if (subfolder) {
    copyPath = path.join(copyPath, 'subfolder');
    fs.mkdirSync(copyPath);
  }

  fs.copySync(fixturesPath, copyPath);

  commit({
    m: commitMessage,
    cwd: tmpPath
  });

  postCommit({
    cwd: tmpPath,
    dirty
  });
}

describe('Acceptance - ember-cli-build', function() {
  this.timeout(30000);

  let tmpPath;

  beforeEach(function() {
    tmpPath = tmp.dirSync().name;
  });

  function merge(options) {
    let fixturesPath = options.fixturesPath;
    let dirty = options.dirty;
    let subfolder = options.subfolder;

    buildTmp(
      fixturesPath,
      tmpPath,
      dirty,
      subfolder
    );

    let copyPath = tmpPath;
    if (subfolder) {
      copyPath = path.join(copyPath, 'subfolder');
    }

    return processBin({
      binFile: 'ember-cli-update',
      args: [
        '--to',
        '2.14.1'
      ],
      cwd: copyPath,
      commitMessage,
      expect
    });
  }

  function fixtureCompare(
    mergeFixtures
  ) {
    _fixtureCompare({
      expect,
      actual: tmpPath,
      expected: mergeFixtures
    });
  }

  it('updates app', function() {
    return merge({
      fixturesPath: 'test/fixtures/local/my-app'
    }).then(result => {
      let status = result.status;

      fixtureCompare('test/fixtures/merge/my-app');

      // changed locally, no change upstream
      expect(status).to.not.contain(' .ember-cli');

      // exists locally, also added upstream with changes
      expect(status).to.contain('modified:   .eslintrc.js');

      // changed locally, removed upstream
      expect(status).to.contain('deleted:    bower.json');

      // changed locally, also changed upstream
      expect(status).to.contain('modified:   README.md');
    });
  });

  it('updates addon', function() {
    return merge({
      fixturesPath: 'test/fixtures/local/my-addon'
    }).then(result => {
      let status = result.status;

      fixtureCompare('test/fixtures/merge/my-addon');

      // changed locally, no change upstream
      expect(status).to.not.contain(' .ember-cli');

      // exists locally, also added upstream with changes
      expect(status).to.contain('modified:   .eslintrc.js');

      // changed locally, removed upstream
      expect(status).to.contain('deleted:    bower.json');

      // changed locally, also changed upstream
      expect(status).to.contain('modified:   README.md');
    });
  });

  it('handles dirty', function() {
    return merge({
      fixturesPath: 'test/fixtures/local/my-app',
      dirty: true
    }).then(result => {
      let stderr = result.stderr;

      expect(stderr).to.contain('You must start with a clean working directory');
      expect(stderr).to.not.contain('UnhandledPromiseRejectionWarning');
    });
  });

  it('handles non-ember-cli app', function() {
    return merge({
      fixturesPath: 'test/fixtures/app'
    }).then(result => {
      let stderr = result.stderr;

      expect(stderr).to.contain('Ember CLI was not found in this project\'s package.json');
    });
  });

  it('works when ember project is subfolder of git dir', function() {
    return merge({
      fixturesPath: 'test/fixtures/local/my-app',
      subfolder: true
    }).then(result => {
      let stderr = result.stderr;

      expect(stderr).to.contain('You must start with a clean working directory');
      expect(stderr).to.not.contain('UnhandledPromiseRejectionWarning');
    });
  });
});
