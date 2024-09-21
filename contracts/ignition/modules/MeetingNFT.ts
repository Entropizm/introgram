import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MeetingModule = buildModule("MeetModule", (m) => {

  const meetingNFT = m.contract("MeetingNFT", []);

  return { meetingNFT };
});

export default MeetingModule;
