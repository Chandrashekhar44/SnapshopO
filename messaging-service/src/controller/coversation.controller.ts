import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";

type ConversationWithMessages = Prisma.ConversationGetPayload<{
  include: { messages: true };
}>;

export const getUserThreads = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = Number(req.params.sellerId);

    const conversations =
      await prisma.conversation.findMany({
        where: {
          members: {
            some: {
              userId,
            },
          },
        },

        include: {
          messages: {
            orderBy: {
              createdAt: "asc",
            },
          },

          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
        },

        orderBy: {
          updatedAt: "desc",
        },
      });

    const threads = conversations.map((c) => {
      const otherUser =
        c.members.find(
          (m) => m.userId !== userId
        )?.user;

        const unread = c.messages.filter(
  (m) =>
    !m.seen &&
    m.senderId !== userId
).length;

      return {
        id: c.id,

        conversationId: c.id,

        name:
          c.isGroup
            ? c.name
            : otherUser?.username ??
              "Unknown User",

        initials:
          (
            c.isGroup
              ? c.name
              : otherUser?.username
          )
            ?.charAt(0)
            .toUpperCase() ?? "U",

        preview:
          c.messages.length > 0
            ? c.messages[
                c.messages.length - 1
              ].text
            : "",

        time: new Date(
          c.updatedAt
        ).toLocaleTimeString(),

        unread,

        online: false,

        distanceLabel: "Nearby",

        members: c.members.map((m) => ({
          id: m.user.id,
          username: m.user.username,
        })),

       messages: c.messages.map((m) => ({
           id: m.id,
           text: m.text,
           senderId: m.senderId,
           seen: m.seen,
           role: m.senderId === userId ? "me" : "other",
           time: new Date(m.createdAt).toLocaleTimeString(),
       })),
      };
    });

    return res.json(threads);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message:
        "Failed to fetch conversations",
    });
  }
};

export const findOrCreateConversation =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const user1Id = Number(
        req.query.buyerId
      );

      const user2Id = Number(
        req.query.sellerId
      );

      if (!user1Id || !user2Id) {
        return res.status(400).json({
          message:
            "user1Id and user2Id are required",
        });
      }

      const existingConversations =
        await prisma.conversation.findMany({
          where: {
            isGroup: false,

            members: {
              some: {
                userId: user1Id,
              },
            },
          },

          include: {
            members: true,

            messages: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

      let conversation =
        existingConversations.find(
          (c) => {
            const memberIds =
              c.members.map(
                (m) => m.userId
              );

            return (
              memberIds.length === 2 &&
              memberIds.includes(
                user1Id
              ) &&
              memberIds.includes(
                user2Id
              )
            );
          }
        );

      if (!conversation) {
        conversation =
          await prisma.conversation.create({
            data: {
              isGroup: false,

              members: {
                create: [
                  {
                    userId: user1Id,
                  },
                  {
                    userId: user2Id,
                  },
                ],
              },
            },

            include: {
              members: true,

              messages: {
                orderBy: {
                  createdAt: "asc",
                },
              },
            },
          });
      }

      return res.json(conversation);
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message:
          "Failed to find or create conversation",
      });
    }
  };

export const getConversationMessages =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const conversationId = Number(
        req.params.id
      );

      const userId = Number(
        req.user.id
      );

      await prisma.message.updateMany({
        where: {
          conversationId,
          senderId: {
            not: userId,
          },
          seen: false,
        },
        data: {
          seen: true,
        },
      });

      const messages =
        await prisma.message.findMany({
          where: {
            conversationId,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        });

      return res.json(messages);
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message:
          "Failed to fetch messages",
      });
    }
  };