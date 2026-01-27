import User from "../models/user.js";

const randomString = () =>
  Math.random().toString(36).substring(2, 8);

export const generateUniqueUsername = async () => {
  let username;
  let exists = true;

  while (exists) {
    username = `user_${randomString()}`;
    const user = await User.findOne({ username });
    if (!user) exists = false;
  }

  return username;
};
