const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);

const cors = require("cors");

const bcrypt = require("bcrypt");
const { now } = require("mongoose");
// const cors = require("cors");

const verifyToken = require("./middlewares/AuthMiddleware");
const verifyAdminToken = require("./middlewares/AdminMiddleware");
const Mailer = require("./Mailer");
const Prisma_Client = require("./_Prisma");
const Socket = require("./Socket/Socket");
const zodiac_signs = require("./zoidiac_sign");

// importing Routes
const AuthRoutes = require("./routes/Auth");
const SocialAuthRoutes = require("./routes/SocialAuth");
const OptVerificationRoutes = require("./routes/OptVerification");
const ResetPasswordRoutes = require("./routes/ResetPassword");
const GiveAway = require("./routes/GiveAway");
const User = require("./routes/User");
const LikeDislike = require("./routes/LikeDislike");
const Discover = require("./routes/discover");
const FollowUnfollow = require("./routes/FollowUnfollow");
const CommentsAndReplies = require("./routes/CommentsAndReplies");
const Chat = require("./routes/Chat");
const AdminAuth = require("./routes/AdminAuth");
const Admin = require("./routes/Admin");
const { getSuccess, getError } = require("./helpers");

app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.use(express.static(__dirname + "/public"));

Mailer.setupTransporter();
Prisma_Client.setupPrisma();
Socket.setupSocket(server);

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const PORT = process.env.PORT || 3003;
server.listen(PORT, async () => {
  console.log(`Server has started on port ${PORT}`);
});

app.get("/api/get_zodiac_signs", (req, res) => {
  try {
    return res.status(200).send(getSuccess(zodiac_signs.zodiac_signs));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(400).send(getError(catchError.message));
    }
    return res.status(400).send(getError(catchError));
  }
});

// Routes
app.use("/api", [
  OptVerificationRoutes,
  AuthRoutes,
  SocialAuthRoutes,
  ResetPasswordRoutes,
]);

// Anonomous Route
app.use("/api", [Discover, AdminAuth]);

app.use("/api/admin/", verifyAdminToken, [Admin]);

// Private Route
app.use("/api", verifyToken, [User, LikeDislike, FollowUnfollow, Chat]);

app.use("/", (req, res) => {
  return res.send({ response: "Matrimonial server is up and running." });
});
