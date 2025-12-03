jest.mock("mongodb");
jest.mock("fs-extra");

const config = require("../../lib/env/config");
const mongodb = require("mongodb");
const database = require("../../lib/env/database");

describe("database", () => {
  let configObj;
  let client;

  function createConfigObj() {
    return {
      mongodb: {
        url: "mongodb://someserver:27017",
        databaseName: "testDb",
        options: {
          connectTimeoutMS: 3600000, // 1 hour
          socketTimeoutMS: 3600000 // 1 hour
        }
      }
    };
  }

  function mockClient() {
    return {
      db: jest.fn().mockReturnValue({ the: "db" }),
      close: "theCloseFnFromMongoClient"
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    configObj = createConfigObj();
    client = mockClient();
    jest.spyOn(config, 'read').mockReturnValue(configObj);
    mongodb.MongoClient.connect.mockResolvedValue(client);
  });

  describe("connect()", () => {
    it("should connect MongoClient to the configured mongodb url with the configured options", async () => {
      const result = await database.connect();
      expect(mongodb.MongoClient.connect).toHaveBeenCalled();
      expect(mongodb.MongoClient.connect).toHaveBeenCalledWith(
        "mongodb://someserver:27017",
        {
          connectTimeoutMS: 3600000, // 1 hour
          socketTimeoutMS: 3600000 // 1 hour
        }
      );

      expect(client.db).toHaveBeenCalledWith("testDb");
      expect(result.db).toEqual({
        the: "db",
        close: "theCloseFnFromMongoClient"
      });
      expect(result.client).toEqual(client);
    });

    it("should yield an error when no url is defined in the config file", async () => {
      delete configObj.mongodb.url;
      await expect(database.connect()).rejects.toThrow("No `url` defined in config file!");
    });

    it("should yield an error when unable to connect", async () => {
      mongodb.MongoClient.connect.mockRejectedValue(new Error("Unable to connect"));
      await expect(database.connect()).rejects.toThrow("Unable to connect");
    });
  });
});
