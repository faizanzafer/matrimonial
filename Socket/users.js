// const { prisma } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const { times } = require("lodash");
const { getEnv } = require("../config");
const { getUserfromId } = require("../database_queries/Auth");
const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;

const users = [];

const addUser = async ({ token, socketId }) => {
  if (!token) return { error: "Token is required." };

  try {
    const { error: err, userData } = await getUserFromToken(token);
    if (err) {
      return { error: err };
    }
    const id = userData.id;
    const existingUser = users.find((user) => user.id == id);

    if (existingUser) return { error: "This User is already Connected." };

    await prisma.users.update({
      where: {
        id,
      },
      data: {
        online_status: true,
        online_status_updated_at: new Date(),
      },
    });

    const user = { id, socketId, token };

    users.push(user);

    return { user };
  } catch (err) {
    return { error: err };
  }
};

const removeUser = async (socketId) => {
  const index = users.findIndex((user) => user.socketId === socketId);

  if (index >= 0) {
    console.log("user found!");
    const { id } = users[index];
    await prisma.users.update({
      where: {
        id,
      },
      data: {
        online_status: false,
        online_status_updated_at: new Date(),
      },
    });
    return users.splice(index, 1)[0];
  }
};

const getUserFromToken = async (token) => {
  if (!token) return { error: "Token is required." };

  try {
    const verified = jwt.verify(token, getEnv("JWT_SECERET"));
    const { _id: id } = verified;
    const user = await getUserfromId(id);
    if (!user)
      return {
        error: "Unauthorized! Please login again to refresh token.",
      };
    return { userData: user };
  } catch (catchError) {
    if (catchError && catchError.message) {
      return { error: catchError.message };
    }
    return { error: "Invalid token!." };
  }
};

const getUser = (id, socketId = null) =>
  users.find((user) =>
    socketId ? user.socketId == socketId && user.id === id : user.id == id
  );

// const getUsersInRoom = (room = "") => users;

module.exports = {
  addUser,
  removeUser,
  getUser,
  // getUsersInRoom,
  getUserFromToken,
};
