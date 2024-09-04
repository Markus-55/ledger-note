// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DigitalNotebook {
    struct Note {
        string content;
        address creator;
        bool isPublic;
        mapping(address => bool) sharedWith;
    }

    mapping(uint256 => Note) private notes;
    mapping(address => uint256[]) private userNotes;
    mapping(uint256 => bool) private noteExists;
    uint256 private noteCounter;

    event NoteCreated(uint256 noteId, address creator);
    event NoteDeleted(uint256 noteId, address creator);
    event NoteSharingUpdated(
        uint256 noteId,
        bool isPublic,
        address[] sharedWith
    );
    event NoteSharingRemoved(uint256 noteId, address removedFrom);

    modifier noteExist(uint256 _noteId) {
        require(_noteId > 0 && _noteId <= noteCounter, "Note does not exist");
        _;
    }

    modifier noteNotDeleted(uint256 _noteId) {
        require(noteExists[_noteId], "Note has been deleted");
        _;
    }

    function addNote(string memory _content) public {
        noteCounter++;
        Note storage newNote = notes[noteCounter];
        newNote.content = _content;
        newNote.creator = msg.sender;
        newNote.isPublic = false;
        userNotes[msg.sender].push(noteCounter);
        noteExists[noteCounter] = true;

        emit NoteCreated(noteCounter, msg.sender);
    }

    function getUserNoteAmount() public view returns (uint256[] memory) {
        return userNotes[msg.sender];
    }

    function deleteNote(
        uint256 _noteId
    ) public noteExist(_noteId) noteNotDeleted(_noteId) {
        Note storage note = notes[_noteId];
        require(
            note.creator == msg.sender,
            "Only the creator can delete this note"
        );

        delete notes[_noteId];
        noteExists[_noteId] = false;

        uint256[] storage userNoteList = userNotes[msg.sender];
        for (uint256 i = 0; i < userNoteList.length; i++) {
            if (userNoteList[i] == _noteId) {
                userNoteList[i] = userNoteList[userNoteList.length - 1];
                userNoteList.pop();
                break;
            }
        }

        emit NoteDeleted(_noteId, msg.sender);
    }
}
