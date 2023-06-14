const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;
const { MessageType } = require(".prisma/client");

function updateUsersChannel(is_users_channel_already_created) {
  return prisma.userChannel.update({
    where: { id: is_users_channel_already_created.id },
  });
}

function getUsersChannel(to_id, id, getChannelMessages = false, offset = 0) {
  return prisma.userChannel.findFirst({
    where: {
      OR: [
        {
          from_id: id,
          to_id,
        },
        {
          from_id: to_id,
          to_id: id,
        },
      ],
    },
    select: {
      id: true,
      to_id: true,
      from_id: true,

      channel_messages:
        getChannelMessages == true
          ? {
              skip: offset * 25,
              take: 25,
              orderBy: { created_at: "desc" },
            }
          : false,
    },
  });
}

function createUsersChannel(data) {
  const { to_id, from_id } = data;
  return prisma.userChannel.create({
    data: { to_id, from_id },
  });
}

async function sendMessageToUsersChannel(data) {
  const {
    to_id,
    from_id,
    users_channels_id,
    message_body,
    message_type,
    attachments,
  } = data;

  const message = await prisma.channelMessages.create({
    data: {
      to_id,
      from_id,
      users_channels_id,
      message_body,
      message_type,
      attachments,
      // seen: true,
    },
  });
  return message;
}

module.exports = {
  updateUsersChannel,
  getUsersChannel,
  createUsersChannel,
  sendMessageToUsersChannel,
};
