vi.mock("mongodb");
vi.mock("fs/promises");
vi.mock("../../lib/env/autoRollback.js", () => ({
  default: {
    wrapDbWithAutoRollback: vi.fn()
  }
}));

import config from "../../lib/env/config.js";
import mongodb from "mongodb";
import database from "../../lib/env/database.js";

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
    // Create a mock collection function
    const collectionFunc = function(name) {
      return { 
        the: "db",
        collectionName: name
      };
    };
    
    const mockDb = {
      the: "db",
      collection: collectionFunc
    };
    
    return {
      db: vi.fn().mockReturnValue(mockDb),
      close: "theCloseFnFromMongoClient"
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    configObj = createConfigObj();
    client = mockClient();
    vi.spyOn(config, 'read').mockReturnValue(configObj);
    vi.spyOn(mongodb.MongoClient, "connect").mockResolvedValue(client);
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
      expect(result.db).toBeDefined();
      expect(result.db.the).toBe("db");
      expect(result.db.close).toBe("theCloseFnFromMongoClient");
      expect(typeof result.db.collection).toBe("function");
      expect(result.client).toEqual(client);
    });

    it("should yield an error when no url is defined in the config file", async () => {
      delete configObj.mongodb.url;
      await expect(database.connect()).rejects.toThrow("No `url` defined in config file!");
    });

    it("should yield an error when unable to connect", async () => {
      vi.spyOn(mongodb.MongoClient, "connect").mockRejectedValue(new Error("Unable to connect"));
      await expect(database.connect()).rejects.toThrow("Unable to connect");
    });
  });
});