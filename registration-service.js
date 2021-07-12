const { UNVERIFIED_USER_CREATED_STREAMS_KEY } = require("./streams-keys");
const userSchema = require("./user-validation-schema");
const bcrypt = require("bcrypt");
const saltRounds = process.env.SALT_ROUNDS || 10;

class RegistrationService {
  constructor(redisClient) {
    this.redisClient = redisClient;
  }

  async #hashPassword(password) {
    return bcrypt.hash(password, saltRounds);
  }

  #processMessage(results) {
    const [, messages] = results[0]; // `key` equals to registration:create_user

    const [id, [, userJson]] = messages[0]; // Only one user should be sent in the first message.

    let user = {};

    try {
      user = JSON.parse(userJson);
    } catch (error) {}

    return {
      id,
      user,
    };
  }

  #prepairUserDataForInserting(user) {
    const data = [];
    for (const property in user) {
      data.push(property, user[property]);
    }
    return data;
  }

  async #sendUnverifiedUserCreatedMessage(id) {
    this.redisClient.rawCallAsync([
      "xadd",
      UNVERIFIED_USER_CREATED_STREAMS_KEY,
      "*",
      "id",
      id,
    ]);
  }

  async #addUser(user) {
    const data = this.#prepairUserDataForInserting(user);
    const id = await this.redisClient.rawCallAsync(["incr", "users"]);
    await this.redisClient.rawCallAsync([
      "hmset",
      `user:${id}`,
      "id",
      id,
      ...data,
    ]);
    this.#sendUnverifiedUserCreatedMessage(id);
  }

  async listenForMessage(key, lastId = "$") {
    // `results` is an array, each element of which corresponds to a key.
    const results = await this.redisClient.rawCallAsync([
      "xread",
      "block",
      0,
      "STREAMS",
      key,
      lastId,
    ]);

    const { id, user } = this.#processMessage(results);

    const { error, value } = userSchema.validate(user);

    if (!error) {
      value["password"] = await this.#hashPassword(value["password"]);
      this.#addUser(value);
    }

    return id;
  }
}

module.exports = RegistrationService;
