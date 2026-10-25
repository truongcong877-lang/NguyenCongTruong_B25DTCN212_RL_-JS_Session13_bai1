const BAGGAGE_ALLOWANCE = {
  ECONOMY: 20,
  BUSINESS: 30,
};

const EXCESS_BAG_FEE_PER_KG = 50000;

const TICKET_STATUS = {
  BOOKED: "BOOKED",
  CHECKED_IN: "CHECKED_IN",
  CANCELLED: "CANCELLED",
};

function findTicketByPnr(db, pnr) {
  if (!pnr || typeof pnr !== "string") return null;
  return db.find(
    (ticket) => ticket.pnr.toUpperCase() === pnr.trim().toUpperCase(),
  );
}

function calculateExcessBaggageFee(classType, actualWeight) {
  if (typeof actualWeight !== "number" || actualWeight < 0) {
    throw new Error("Trọng lượng hành lý không hợp lệ!");
  }

  const allowance = BAGGAGE_ALLOWANCE[classType.toUpperCase()] || 20;
  const excessWeight = actualWeight - allowance;

  if (excessWeight <= 0) {
    return { excessWeight: 0, fee: 0 };
  }

  return {
    excessWeight,
    fee: excessWeight * EXCESS_BAG_FEE_PER_KG,
  };
}

function checkInPassenger(db, pnr, actualWeight) {
  const ticket = findTicketByPnr(db, pnr);

  if (!ticket) {
    throw new Error(`[Lỗi] Không tìm thấy vé với mã PNR: ${pnr}`);
  }
  if (ticket.status === TICKET_STATUS.CANCELLED) {
    throw new Error(`[Lỗi] Vé ${pnr} đã bị hủy, không thể check-in!`);
  }
  if (ticket.status === TICKET_STATUS.CHECKED_IN) {
    throw new Error(`[Lỗi] Vé ${pnr} đã hoàn tất thủ tục check-in trước đó!`);
  }

  const { excessWeight, fee } = calculateExcessBaggageFee(
    ticket.classType,
    actualWeight,
  );

  ticket.actualWeight = actualWeight;
  ticket.excessFee = fee;
  ticket.status = TICKET_STATUS.CHECKED_IN;

  return {
    ticket,
    excessWeight,
    fee,
  };
}

function searchTickets(db, keyword) {
  if (!keyword) return [];
  const query = keyword.toLowerCase();
  return db.filter(
    (ticket) =>
      ticket.pnr.toLowerCase().includes(query) ||
      ticket.passengerName.toLowerCase().includes(query),
  );
}

function cancelTicket(db, pnr) {
  const ticket = findTicketByPnr(db, pnr);
  if (!ticket) {
    throw new Error(`[Lỗi] Không tìm thấy vé PNR: ${pnr}`);
  }
  if (ticket.status === TICKET_STATUS.CANCELLED) {
    return `Vé ${pnr} đã ở trạng thái hủy trước đó.`;
  }

  ticket.status = TICKET_STATUS.CANCELLED;
  return `Đã hủy thành công vé cho mã PNR: ${pnr}`;
}

function displayBoardingPass(ticket) {
  console.log("\n========================================");
  console.log("          BOARDING PASS - RIKKEIAIR       ");
  console.log("========================================");
  console.log(` Mã PNR       : ${ticket.pnr}`);
  console.log(` Hành khách   : ${ticket.passengerName}`);
  console.log(` Chuyến bay   : ${ticket.flightNumber}`);
  console.log(` Hạng vé      : ${ticket.classType}`);
  console.log(` Số ghế       : ${ticket.seat}`);
  console.log(` Trọng lượng  : ${ticket.actualWeight || 0} kg`);
  console.log(
    ` Phụ thu quá cước: ${ticket.excessFee ? ticket.excessFee.toLocaleString() + " VNĐ" : "0 VNĐ"}`,
  );
  console.log(` Trạng thái   : ${ticket.status}`);
  console.log("========================================\n");
}

const flightDatabase = [
  {
    pnr: "RK101",
    passengerName: "Nguyen Van Quan",
    flightNumber: "VN-A102",
    classType: "ECONOMY",
    seat: "12A",
    status: "BOOKED",
    actualWeight: 0,
    excessFee: 0,
  },
  {
    pnr: "RK102",
    passengerName: "Tran Thi Mai",
    flightNumber: "VN-A102",
    classType: "BUSINESS",
    seat: "2C",
    status: "BOOKED",
    actualWeight: 0,
    excessFee: 0,
  },
  {
    pnr: "RK103",
    passengerName: "Le Hoang Nam",
    flightNumber: "VN-B205",
    classType: "ECONOMY",
    seat: "15F",
    status: "BOOKED",
    actualWeight: 0,
    excessFee: 0,
  },
];

function handleMenuChoice(choice, payload) {
  switch (choice) {
    case "1":
      console.log("\n--- DANH SÁCH VÉ CHUYẾN BAY ---");
      if (flightDatabase.length === 0) {
        console.log("Không có vé nào trong hệ thống.");
      } else {
        flightDatabase.forEach((t, i) => {
          console.log(
            `${i + 1}. PNR: ${t.pnr} | Tên: ${t.passengerName} | Hạng: ${t.classType} | Trạng thái: ${t.status}`,
          );
        });
      }
      break;

    case "2":
      try {
        const { pnr, weight } = payload;
        const result = checkInPassenger(flightDatabase, pnr, weight);
        console.log(
          `\nCheck-in thành công cho PNR: ${pnr}! Phụ thu hành lý: ${result.fee.toLocaleString()} VNĐ`,
        );
        displayBoardingPass(result.ticket);
      } catch (err) {
        console.error(err.message);
      }
      break;

    case "3":
      const results = searchTickets(flightDatabase, payload.keyword);
      if (results.length === 0) {
        console.log(`Không tìm thấy kết quả cho từ khóa: "${payload.keyword}"`);
      } else {
        console.log(`\n--- KẾT QUẢ TRA CỨU (${results.length}) ---`);
        results.forEach((t) => {
          console.log(
            `- PNR: ${t.pnr} | Khách: ${t.passengerName} | Ghế: ${t.seat} | Trạng thái: ${t.status}`,
          );
        });
      }
      break;

    case "4":
      try {
        const message = cancelTicket(flightDatabase, payload.pnr);
        console.log(message);
      } catch (err) {
        console.error(err.message);
      }
      break;

    case "5":
      console.log("Đã kết thúc ca làm việc. Hẹn gặp lại!");
      break;

    default:
      console.log("Lựa chọn không hợp lệ. Vui lòng chọn từ 1 đến 5!");
  }
}
