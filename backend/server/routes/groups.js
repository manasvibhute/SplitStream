const express = require("express");
const { prisma } = require("../utils/db");
const requireAuth = require("../middleware/auth");
const { assertGroupMember, getGroupSnapshot } = require("../services/groupService");

const router = express.Router();
router.use(requireAuth);

router.post("/", async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required." });
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        members: {
          create: { userId: req.user.sub },
        },
      },
    });

    res.status(201).json(await getGroupSnapshot(group.id));
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: req.user.sub },
      include: {
        group: {
          include: {
            members: true,
            expenses: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { createdAt: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    res.json(
      memberships.map(({ group }) => ({
        id: group.id,
        name: group.name,
        createdAt: group.createdAt,
        memberCount: group.members.length,
        lastExpenseAt: group.expenses[0]?.createdAt || null,
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    await assertGroupMember(req.params.id, req.user.sub);
    res.json(await getGroupSnapshot(req.params.id));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/members", async (req, res, next) => {
  try {
    await assertGroupMember(req.params.id, req.user.sub);
    const user = await prisma.user.findUnique({
      where: { email: String(req.body.email || "").toLowerCase().trim() },
    });
    if (!user) return res.status(404).json({ message: "No user exists with that email." });

    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: req.params.id, userId: user.id },
      },
    });

    if (existingMember) {
      return res.status(409).json({ message: "That user is already in the group." });
    }

    await prisma.groupMember.create({
      data: {
        groupId: req.params.id,
        userId: user.id,
      },
    });

    const snapshot = await getGroupSnapshot(req.params.id);
    req.io.to(req.params.id).emit("member:joined", snapshot);
    res.status(201).json(snapshot);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
