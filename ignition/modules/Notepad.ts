import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
const hre = require("hardhat");

const NotepadModule = buildModule("NotepadModule", (m) => {
  const notepad = m.contract("Notepad");

  return { notepad };
});

export default NotepadModule;
