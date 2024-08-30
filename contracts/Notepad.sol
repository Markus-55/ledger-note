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

    function addNote(string memory _title, string memory _note) public noteDoesNotExist(msg.sender, _title) {
        ++noteCount;
        userNotes[msg.sender][_title] = NoteData(noteCount, msg.sender, _title, _note, true);
        userNoteByTitles[msg.sender].push(_title);
    }

    function getUserNoteCount() external view returns (uint256) {
        return userNoteByTitles[msg.sender].length;
    }

    function getUserNotes() external view returns (uint256[] memory _ids, address _owner, string[] memory _titles, string[] memory _notes) {
        uint256 countNotes = userNoteByTitles[msg.sender].length;
        _ids = new uint256[](countNotes);
        _titles = new string[](countNotes);
        _notes = new string[](countNotes);

        for(uint256 i = 0; i < countNotes; ++i) {
            string memory title = userNoteByTitles[msg.sender][i];
            NoteData storage noteData = userNotes[msg.sender][title];
            
            _ids[i] = noteData.id;
            _owner = noteData.owner;
            _titles[i] = noteData.title;
            _notes[i] = noteData.note;
        }

        return (_ids, _owner, _titles, _notes);
    } 
}
