// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

contract Notepad {
    struct NoteData {
        uint256 id;
        address owner;
        string title;
        string note;
        bool exist;
    }

    uint256 private noteCount;

    mapping(address => mapping(string => NoteData)) userNotes;
    mapping(address => string[]) userNoteByTitles;

    modifier noteDoesNotExist(address _user, string memory _title) {
        require(
            !userNotes[msg.sender][_title].exist,
            "Note does already exist"
        );
        _;
    }

    modifier noteExists(address _user, string memory _title) {
        require(userNotes[msg.sender][_title].exist, "Note does not exist");
        _;
    }
}
