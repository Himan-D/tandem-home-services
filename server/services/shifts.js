const logger = require('../lib/logger');

class ShiftManager {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async upsertShifts(partnerId, shifts) {
    return this.prisma.$transaction(async (tx) => {
      await tx.partnerShift.deleteMany({ where: { partnerId } });
      for (const shift of shifts) {
        await tx.partnerShift.create({
          data: {
            partnerId,
            dayOfWeek: shift.dayOfWeek,
            startTime: shift.startTime,
            endTime: shift.endTime,
            breakStart: shift.breakStart || null,
            breakEnd: shift.breakEnd || null,
          },
        });
      }
    });
  }

  async getShifts(partnerId) {
    return this.prisma.partnerShift.findMany({
      where: { partnerId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async isOnShift(partnerId) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const timeStr = now.toTimeString().slice(0, 5);

    const shifts = await this.prisma.partnerShift.findMany({
      where: {
        partnerId,
        dayOfWeek,
        startTime: { lte: timeStr },
        endTime: { gte: timeStr },
        isActive: 1,
      },
    });

    if (shifts.length === 0) return false;

    for (const shift of shifts) {
      if (shift.breakStart && shift.breakEnd) {
        if (timeStr >= shift.breakStart && timeStr <= shift.breakEnd) {
          return false;
        }
      }
    }

    return true;
  }

  async autoOfflinePartners() {
    const onlinePartners = await this.prisma.user.findMany({
      where: {
        role: 'partner',
        proAvailability: { isAvailable: 1 },
      },
      select: { id: true },
    });

    let offlined = 0;
    for (const partner of onlinePartners) {
      const onShift = await this.isOnShift(partner.id);
      if (!onShift) {
        await this.prisma.proAvailability.updateMany({
          where: { partnerId: partner.id },
          data: { isAvailable: 0 },
        });
        offlined++;
      }
    }

    if (offlined > 0) {
      logger.info({ count: offlined }, 'Auto-offlined partners not on shift');
    }
    return offlined;
  }
}

module.exports = { ShiftManager };
