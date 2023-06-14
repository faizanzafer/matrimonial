const socketio = require("socket.io");
const { getEnv } = require("../config");
const {
  getUserfromId,
  getUserNotifications,
} = require("../database_queries/Auth");
const {
  getUsersChannel,
  createUsersChannel,
  sendMessageToUsersChannel,
  updateUsersChannel,
} = require("../database_queries/Chat");
const { messageValidation } = require("../routes/validate");
const { getError, getSuccess } = require("../helpers");

const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
  getUserFromToken,
} = require("./users");
const { MessageType } = require(".prisma/client");
// const { get } = require("../routes/Chat");
class Socket {
  static io = null;
  static global_array = [];

  static async setupSocket(server) {
    this.io = socketio(server, {
      cors: {
        origin: "*",
      },
    });

    this.io.on("connect", (socket) => {
      this.global_array.push(socket);
      // this.io.sockets.map((item) => {})
      // console.log(this.global_array);
      console.log("socket id: ", socket.id);
      socket.on("join", async ({ token }, callback) => {
        try {
          const { error, user } = await addUser({ token, socketId: socket.id });
          if (error) return callback(getError(error));
          socket.broadcast.emit("userOnlineStatus", {
            user_id: user.id,
            online_status: true,
            time: new Date(),
          });
          return callback(getSuccess("User Connected to Socket Successfully"));
        } catch (catchError) {
          if (catchError && catchError.message) {
            console.log(getError(catchError.message));
            return;
          }
          console.log(getError(catchError));
          return;
        }
      });

      socket.on("logout", () => {
        socket.disconnect(true);
      });

      socket.on("disconnect", async () => {
        const user = await removeUser(socket.id);
        console.log("socket disconnected", socket.id, user);
        if (user) {
          console.log("user removed!");

          socket.broadcast.emit("userOnlineStatus", {
            user_id: user.id,
            online_status: false,
            time: new Date(),
          });
          console.log("user  offline");
        }
      });
    });
  }

  static async adminDisapproveUser(message) {
    if (this.io) {
      this.io.emit("admin_disapprove", {
        message,
      });
    }
  }

  static async sendMessageToSecondaryUser(id, to_id, message) {
    if (this.io) {
      const my_id = getUser(id);
      if (my_id) {
        const secondaryUser = getUser(to_id);
        if (secondaryUser) {
          this.io.to(secondaryUser.socketId).emit("message", {
            message,
            user_id: id,
          });
        }
      }
    }
  }

  static async autoBlockUser(id, to_id) {
    if (this.io) {
      const my_id = getUser(id);
      if (my_id) {
        const secondaryUser = getUser(to_id);
        if (secondaryUser) {
          this.io.to(secondaryUser.socketId).emit("auto_block", {
            user_id: id,
          });
        }
      }
    }
  }

  static async userBlock(id, blocked_id, block_status) {
    if (this.io) {
      const my_id = getUser(id);
      if (my_id) {
        const otherUser = getUser(blocked_id);
        if (otherUser) {
          this.io.to(otherUser.socketId).emit("block_status", {
            block_status,
            blocker_id: id,
          });
        }
      }
    }
  }

  static async likeProfile(id, liked_id, like_status) {
    if (this.io) {
      const my_id = getUser(id);
      if (my_id) {
        const otherUser = getUser(liked_id);
        if (otherUser) {
          this.io.to(otherUser.socketId).emit("like_status", {
            like_status,
            liker_id: id,
            liked_id,
          });
          const other = await getUserNotifications(liked_id);
          this.io.to(otherUser.socketId).emit("notifications", {
            notification_count: other.length,
          });
        }
      }
    }
  }

  static async visitProfile(id, user_id, user, visit_status) {
    if (this.io) {
      const my_id = getUser(id);
      if (my_id) {
        const otherUser = getUser(user_id);
        if (otherUser) {
          this.io.to(otherUser.socketId).emit("visit_status", {
            visit_status,
            user_id,
            visiter_id: id,
            user,
          });
          const other = await getUserNotifications(user_id);
          this.io.to(otherUser.socketId).emit("notifications", {
            notification_count: other.length,
          });
        }
      }
    }
  }

  static async friendRequest(id, liker_id, request_status, message) {
    if (this.io) {
      const my_id = getUser(id);
      if (my_id) {
        const otherUser = getUser(liker_id);
        if (otherUser) {
          this.io.to(otherUser.socketId).emit("friend_request", {
            liker_id: id,
            liker_id,
            request_status,
            message,
          });
          const other = await getUserNotifications(liker_id);
          this.io.to(otherUser.socketId).emit("reqNotifications", {
            notification_count: other.length,
          });
        }
      }
    }
  }

  static async requestPrivatePictures(id, second_user_id, message) {
    if (this.io) {
      const my_id = getUser(id);
      if (my_id) {
        const otherUser = getUser(second_user_id);
        if (otherUser) {
          this.io.to(otherUser.socketId).emit("request_status", {
            message,
            first_user_id: id,
            second_user_id,
          });
          const other = await getUserNotifications(second_user_id);
          this.io.to(otherUser.socketId).emit("picNotifications", {
            notification_count: other.length,
          });
        }
      }
    }
  }

  static async togglePhone(user_id, status) {
    if (this.io) {
      const my_id = getUser(user_id);
      if (my_id) {
        this.io.to(my_id.socketId).emit("show_phone", {
          user_id,
          status,
        });
      }
    }
  }

  static async toggleProfilePicture(user_id, status) {
    if (this.io) {
      const my_id = getUser(user_id);
      if (my_id) {
        this.io.to(my_id.socketId).emit("show_profile", {
          user_id,
          status,
        });
      }
    }
  }

  static async togglePrivatePicture(user_id, status) {
    if (this.io) {
      const my_id = getUser(user_id);
      if (my_id) {
        this.io.to(my_id.socketId).emit("show_private", {
          user_id,
          status,
        });
      }
    }
  }

  static async toggleMyNotification(user_id, status) {
    if (this.io) {
      const my_id = getUser(user_id);
      if (my_id) {
        this.io.to(my_id.socketId).emit("show_notifications", {
          user_id,
          status,
        });
      }
    }
  }

  static async seenMessages(id, second_user_id, message_id, seen_status) {
    if (this.io) {
      const my_id = getUser(id);
      if (my_id) {
        const otherUser = getUser(second_user_id);
        if (otherUser) {
          this.io.to(otherUser.socketId).emit("seen_status", {
            first_user_id: id,
            second_user_id,
            message_id,
            seen_status,
          });
        }
      }
    }
  }
}

module.exports = Socket;
