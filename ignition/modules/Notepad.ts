import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
const hre = require("hardhat");

const NotepadModule = buildModule("NotepadModule", (m) => {
  const owner = m.getAccount(0);
  const notepad = m.contract("Notepad", [owner], {});

  return { notepad };
});

export default NotepadModule;
