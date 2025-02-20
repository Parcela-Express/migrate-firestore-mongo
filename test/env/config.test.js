const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

const path = require("path");

describe("config", () => {
  let config; // module under test
  let fs; // mocked dependencies

  function mockFs() {
    return {
      stat: sinon.stub()
    };
  }

  beforeEach(() => {
    fs = mockFs();
    config = proxyquire("../../lib/env/config", { "fs-extra": fs });
  });

  describe("shouldExist()", () => {

    it('should not yield an error when the config was set manually', async () => {
      fs.stat.rejects();
      config.set({ my: 'config'})
      await config.shouldExist();
    });

    it("should not yield an error if the config exists", async () => {
      fs.stat.returns(Promise.resolve());
      await config.shouldExist();
    });

    it("should yield an error if the config does not exist", async () => {
      const configPath = path.join(process.cwd(), "migrate-firestore-mongo-config.js");
      fs.stat.returns(Promise.reject(new Error("It does not exist")));
      try {
        await config.shouldExist();
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.equal(
          `config file does not exist: ${configPath}`
        );
      }
    });
  });

  describe("shouldNotExist()", () => {

    it('should not yield an error when the config was set manually', async () => {
      fs.stat.rejects();
      config.set({ my: 'config'})
      await config.shouldNotExist();
    });

    it("should not yield an error if the config does not exist", async () => {
      const error = new Error("File does not exist");
      error.code = "ENOENT";
      fs.stat.returns(Promise.reject(error));
      await config.shouldNotExist();
    });

    it("should yield an error if the config exists", async () => {
      const configPath = path.join(process.cwd(), "migrate-firestore-mongo-config.js");
      fs.stat.returns(Promise.resolve());
      try {
        await config.shouldNotExist();
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.equal(
          `config file already exists: ${configPath}`
        );
      }
    });
  });

  describe("getConfigFilename()", () => {
    it("should return the config file name", () => {
      expect(config.getConfigFilename()).to.equal(
        "migrate-firestore-mongo-config.js"
      );
    });
  });

  describe("read()", () => {

    it('should resolve with the custom config content when config content was set manually', async () => {
      const expected = { my: 'custom-config'};
      config.set(expected);
      const actual = await config.read();
      expect(actual).to.deep.equal(expected);
    });

    it("should attempt to read the config file", async () => {
      const configPath = path.join(process.cwd(), "migrate-firestore-mongo-config.js");
      try {
        await config.read();
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.match(new RegExp(`Cannot find module '${configPath}'`));
      }
    });

    it("should be possible to read a custom, absolute config file path", async () => {
      global.options = { file: "/some/absoluete/path/to/a-config-file.js" };
      try {
        await config.read();
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.match(
          new RegExp(`Cannot find module '${global.options.file}'`)
        );
      }
    });

    it("should be possible to read a custom, relative config file path", async () => {
      global.options = { file: "./a/relative/path/to/a-config-file.js" };
      const configPath = path.join(process.cwd(), global.options.file);
      try {
        await config.read();
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.match(new RegExp(`Cannot find module '${configPath}'`));
      }
    });
  });
});
